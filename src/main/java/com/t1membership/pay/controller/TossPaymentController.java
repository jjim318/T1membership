// TossPaymentController.java
package com.t1membership.pay.controller;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.MembershipPayType;
import com.t1membership.item.constant.PopPlanType;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.constant.TossPaymentMethod;
import com.t1membership.pay.constant.TossPaymentStatus;
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
import java.util.Objects;

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

        // 1) 문자열 method -> enum 변환
        TossPaymentMethod tossMethod;
        switch (method.toUpperCase()) {
            case "CARD" -> tossMethod = TossPaymentMethod.CARD;
            case "ACCOUNT" -> tossMethod = TossPaymentMethod.TRANSFER;       // 쓰고싶은 쪽으로
            case "VIRTUAL_ACCOUNT" -> tossMethod = TossPaymentMethod.VIRTUAL_ACCOUNT;
            case "MOBILE_PHONE" -> tossMethod = TossPaymentMethod.MOBILE_PHONE;
            case "EASY_PAY" -> tossMethod = TossPaymentMethod.EASY_PAY;
            default -> tossMethod = TossPaymentMethod.UNKNOWN;
        }

        if (tossPayment == null) {
            log.warn("[TossPrepare] TossPayment is null. create new. orderNo={}", orderNo);

            tossPayment = TossPaymentEntity.builder()
                    .order(order)                                // 주문 연결
                    .totalAmount(BigDecimal.valueOf(amount))     // 결제 금액
                    .tossPaymentMethod(tossMethod)               // 🔥 method NOT NULL
                    .tossPaymentStatus(TossPaymentStatus.PENDING)  // 🔥 status NOT NULL 기본값
                    .build();

            order.setTossPayment(tossPayment);
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
    // 결제 승인(confirm) – 굿즈 / 멤버십 / POP 공통
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

        // ==========================
        // 1) 토스 최종 승인 (공통)
        // ==========================
        Map<String, Object> tossResult =
                tossPaymentService.confirmPayment(paymentKey, orderId, serverAmount);

        // ==========================
        // 2) 주문 상태/결제 정보 업데이트 (공통)
        // ==========================
        order.setOrderStatus(OrderStatus.PAID);
        // 필요하면 여기서 paymentMethod / paymentStatus / paidAt 등도 세팅 가능

        // ==========================
        // 3) 멤버십 / POP 후처리
        // ==========================
        applyMembershipIfNeeded(order); // 멤버십 주문이면 멤버 membershipType 갱신
        applyPopIfNeeded(order);        // POP 주문이면 멤버 popType 갱신

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

    // ==========================
    // 멤버십 주문 후처리
    // ==========================
    private void applyMembershipIfNeeded(OrderEntity order) {
        var member = order.getMember();
        if (member == null) {
            log.warn("[MembershipAfterPay] member is null. orderNo={}", order.getOrderNo());
            return;
        }

        // 주문 아이템 중 MEMBERSHIP 카테고리인 상품 찾기
        var membershipItemOpt = order.getOrderItems().stream()
                .map(OrderItemEntity::getItem)
                .filter(Objects::nonNull)
                .filter(item -> item.getItemCategory() == ItemCategory.MEMBERSHIP)
                .findFirst();

        if (membershipItemOpt.isEmpty()) {
            // 이 주문은 멤버십 주문이 아님
            return;
        }

        var membershipItem = membershipItemOpt.get();
        MembershipPayType payType = membershipItem.getMembershipPayType(); // <- ItemEntity 게터명에 맞게 조정
        if (payType == null) {
            log.warn("[MembershipAfterPay] membershipPayType is null. orderNo={}, itemNo={}",
                    order.getOrderNo(), membershipItem.getItemNo());
            return;
        }

        // 🔥 멤버 DB에 멤버십 타입 반영
        member.setMembershipType(payType);

        log.info("[MembershipAfterPay] member={} 멤버십 활성화, type={}",
                member.getMemberEmail(), payType);
    }

    // ==========================
    // POP 주문 후처리
    // ==========================
    private void applyPopIfNeeded(OrderEntity order) {
        var member = order.getMember();
        if (member == null) {
            log.warn("[PopAfterPay] member is null. orderNo={}", order.getOrderNo());
            return;
        }

        // 주문 아이템 중 POP 카테고리인 상품 찾기
        var popItemOpt = order.getOrderItems().stream()
                .map(OrderItemEntity::getItem)
                .filter(Objects::nonNull)
                .filter(item -> item.getItemCategory() == ItemCategory.POP)
                .findFirst();

        if (popItemOpt.isEmpty()) {
            // POP 주문이 아님
            return;
        }

        var popItem = popItemOpt.get();
        PopPlanType popPlanType = popItem.getPopPlanType(); // <- ItemEntity 게터명에 맞게 조정
        if (popPlanType == null) {
            log.warn("[PopAfterPay] popPlanType is null. orderNo={}, itemNo={}",
                    order.getOrderNo(), popItem.getItemNo());
            return;
        }

        // 🔥 멤버 DB에 POP 타입 반영
        member.setPopType(popPlanType);

        log.info("[PopAfterPay] member={} POP 활성화, type={}",
                member.getMemberEmail(), popPlanType);
    }

}
