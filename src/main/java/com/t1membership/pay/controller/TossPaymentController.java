// TossPaymentController.java
package com.t1membership.pay.controller;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.domain.TossPaymentEntity;
import com.t1membership.pay.dto.TossConfirmReq;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pay/toss")
@Slf4j
public class TossPaymentController {

    private final OrderRepository orderRepository;
    private final TossPaymentService tossPaymentService;

    // ==========================
    // 공통 유틸
    // ==========================
    private int computeOrderAmount(OrderEntity order) {
        return order.getOrderItems().stream()
                .map(oi -> {
                    BigDecimal line = oi.getLineTotal();
                    if (line == null || line.compareTo(BigDecimal.ZERO) <= 0) {
                        line = oi.getPriceAtOrder().multiply(
                                BigDecimal.valueOf(oi.getQuantity())
                        );
                    }
                    return line;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .intValueExact();
    }

    private String currentMemberId(Authentication auth) {
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        if (p instanceof UserDetails u) return u.getUsername();
        if (p instanceof OAuth2User ou) return ou.getName();
        if (p instanceof String s && !"anonymousUser".equals(s)) return s;
        return null;
    }

    private void assertPayable(OrderEntity order) {
        if (order.getOrderStatus() != OrderStatus.ORDERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 불가 상태");
        }
    }

    // ==========================
    // 결제 준비 (checkout 창 띄우기 전)
    // ==========================
    @PostMapping("/prepare")
    @Transactional
    public ResponseEntity<?> prepare(@RequestBody Map<String, Object> body,
                                     Authentication authentication) {

        Long orderNo = Long.valueOf(body.get("orderNo").toString());
        String method = String.valueOf(body.getOrDefault("method", "CARD"));

        OrderEntity order = orderRepository.getReferenceById(orderNo);

        // 로그인되어 있으면 소유자 검증
        String memberId = currentMemberId(authentication);
        if (memberId != null && !memberId.equals(order.getMember().getMemberEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문만 결제 가능");
        }

        if (order.getOrderStatus() != OrderStatus.ORDERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 불가 상태");
        }

        int amount = computeOrderAmount(order);
        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPTY_ORDER_AMOUNT");
        }

        // 최소 결제금액 가드
        int min = "ACCOUNT".equalsIgnoreCase(method) ? 200 : 100;
        if (amount < min) {
            return ResponseEntity.badRequest().body(Map.of(
                    "isSuccess", false,
                    "resCode", 400,
                    "resMessage", "MIN_AMOUNT_NOT_MET",
                    "data", Map.of("min", min, "amount", amount, "method", method)
            ));
        }

        // ==============================
        // 🔥 토스용 orderId(orderTossId) - 매번 새로 생성
        // ==============================
        TossPaymentEntity tossPayment = order.getTossPayment();
        if (tossPayment == null) {
            log.error("[TossPrepare] TossPayment is null. orderNo={}", orderNo);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Toss 결제정보가 없습니다.");
        }

        // ❗ 기존 값 무시하고 항상 새로 발급
        String orderTossId = "ANP-" + order.getOrderNo() + "-" + System.currentTimeMillis();
        tossPayment.setOrderTossId(orderTossId);
        log.info("[TossPrepare] new orderTossId={}, orderNo={}", orderTossId, orderNo);

        orderRepository.save(order);

        String orderName = makeOrderName(order);

        return ResponseEntity.ok(Map.of(
                "isSuccess", true,
                "data", Map.of(
                        "orderNo", order.getOrderNo(),
                        "orderId", orderTossId,   // 토스 위젯에 넘길 orderId
                        "amount", amount,
                        "orderName", orderName
                )
        ));
    }

    private String makeOrderName(OrderEntity order) {
        var items = order.getOrderItems();
        if (items == null || items.isEmpty()) return "주문";
        String first = (items.get(0).getItemNameSnapshot() != null)
                ? items.get(0).getItemNameSnapshot() : "상품";
        int rest = Math.max(0, items.size() - 1);
        return (rest > 0) ? first + " 외 " + rest + "건" : first;
    }

    // ==========================
    // 결제 승인(confirm)
    // ==========================
    @PostMapping("/confirm")
    @Transactional
    public ResponseEntity<?> confirm(@RequestBody TossConfirmReq req,
                                     Authentication authentication) {

        String paymentKey = req.getPaymentKey();
        String orderId    = req.getOrderId();      // Toss orderId (order_toss_id or orderNo)
        Integer amount    = req.getTotalAmount();

        log.info("[TossConfirm] req orderId={}, paymentKey={}, totalAmount={}",
                orderId, paymentKey, amount);

        if (paymentKey == null || paymentKey.isBlank()
                || orderId == null || orderId.isBlank()
                || amount == null) {

            log.warn("[TossConfirm] invalid request body. req={}", req);

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "isSuccess", false,
                            "resCode", 400,
                            "resMessage", "invalid request"
                    )
            );
        }

        int clientAmount = amount.intValue();

        // 1차: order_toss_id 로 조회
        OrderEntity order = orderRepository.findByTossPayment_OrderTossId(orderId)
                .orElseGet(() -> {
                    try {
                        Long orderNoLong = Long.valueOf(orderId);
                        return orderRepository.findById(orderNoLong).orElse(null);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                });

        if (order == null) {
            log.warn("[TossConfirm] 주문 없음. orderId={}", orderId);
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "주문 없음(orderId=" + orderId + ")"
            );
        }

        Long orderNo = order.getOrderNo();

        String memberId = currentMemberId(authentication);
        if (memberId != null && !memberId.equals(order.getMember().getMemberEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문만 결제 가능");
        }

        assertPayable(order);

        int serverAmount = computeOrderAmount(order);

        log.info("[TossConfirm] before adjust serverAmount={}, orderTotalPrice={}",
                serverAmount,
                order.getOrderTotalPrice()
        );

        if (serverAmount <= 0 && order.getOrderTotalPrice() != null) {
            BigDecimal otp = order.getOrderTotalPrice();
            if (otp.compareTo(BigDecimal.ZERO) > 0) {
                serverAmount = otp.intValue();
                log.info("[TossConfirm] adjusted serverAmount from orderTotalPrice={}", serverAmount);
            }
        }

        if (serverAmount <= 0) {
            log.warn("[TossConfirm] EMPTY_ORDER_AMOUNT. orderNo={}, serverAmount={}",
                    orderNo, serverAmount);

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "isSuccess", false,
                            "resCode", 400,
                            "resMessage", "EMPTY_ORDER_AMOUNT"
                    )
            );
        }

        if (serverAmount != clientAmount) {
            log.warn("[TossConfirm] 금액 불일치. orderNo={}, serverAmount={}, clientAmount={}",
                    orderNo, serverAmount, clientAmount);

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "isSuccess", false,
                            "resCode", 400,
                            "resMessage", "금액 불일치"
                    )
            );
        }

        Map<String, Object> tossResult =
                tossPaymentService.confirmPayment(paymentKey, orderId, serverAmount);

        order.setOrderStatus(OrderStatus.PAID);
        orderRepository.save(order);

        log.info("[TossConfirm] success. orderNo={}, serverAmount={}, orderId={}",
                orderNo, serverAmount, orderId);

        return ResponseEntity.ok(
                Map.of(
                        "isSuccess", true,
                        "resCode", 200,
                        "resMessage", "OK",
                        "data", Map.of(
                                "orderNo", orderNo,
                                "toss", tossResult
                        )
                )
        );
    }

}
