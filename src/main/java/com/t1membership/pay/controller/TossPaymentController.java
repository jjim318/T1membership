// TossPaymentController.java
package com.t1membership.pay.controller;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pay/toss")
public class TossPaymentController {

    private final OrderRepository orderRepository;
    private final TossPaymentService tossPaymentService;

    // 공통: 라인합 재계산(BigDecimal 기반)
    private int computeOrderAmount(OrderEntity order) {

        return order.getOrderItems().stream()
                .map(oi -> {
                    BigDecimal line = oi.getLineTotal();

                    // lineTotal <= 0 이면 priceAtOrder * quantity 로 계산
                    if (line == null || line.compareTo(BigDecimal.ZERO) <= 0) {
                        line = oi.getPriceAtOrder().multiply(
                                BigDecimal.valueOf(oi.getQuantity())
                        );
                    }

                    return line;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)          // BigDecimal 합계
                .intValueExact();                                   // Toss cancelAmount 위해 Integer 변환
    }
    // 공통 헬퍼 (컨트롤러 안에 추가)
    private String currentMemberId(Authentication auth) {
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        if (p instanceof UserDetails u) return u.getUsername();
        if (p instanceof OAuth2User ou) return ou.getName();   // 필요 시 매핑 변경
        if (p instanceof String s && !"anonymousUser".equals(s)) return s;
        return null; // 익명 등
    }

    private void assertPayable(OrderEntity order) {
        if (order.getOrderStatus() != OrderStatus.ORDERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 불가 상태");
        }
    }

    @PostMapping("/prepare")
    public ResponseEntity<?> prepare(@RequestBody Map<String, Object> body, Authentication authentication) {
        Long orderNo = Long.valueOf(body.get("orderNo").toString());
        String method = String.valueOf(body.getOrDefault("method", "CARD"));
        OrderEntity order = orderRepository.getReferenceById(orderNo);

        // 로그인되어 있으면 소유자 검증(테스트 중 익명 접근은 통과)
        String memberId = currentMemberId(authentication); // private helper
        if (memberId != null && !memberId.equals(order.getMember().getMemberEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문만 결제 가능");
        }
        if (order.getOrderStatus() != OrderStatus.ORDERED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결제 불가 상태");

        int amount = computeOrderAmount(order);
        if (amount <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPTY_ORDER_AMOUNT");
        // ★★★ 최소 결제금액 가드 (여기에 넣는다!)
        int min = "ACCOUNT".equalsIgnoreCase(method) ? 200 : 100; // 카드=100, 계좌=200
        if (amount < min) {
            return ResponseEntity.badRequest().body(Map.of(
                    "isSuccess", false,
                    "resCode", 400,
                    "resMessage", "MIN_AMOUNT_NOT_MET",
                    "data", Map.of("min", min, "amount", amount, "method", method)
            ));
        }

        String orderId = "ANP-" + order.getOrderNo() + "-" + System.currentTimeMillis();
        String orderName = makeOrderName(order);

        // prepare 마지막 return만 교체
        return ResponseEntity.ok(Map.of(
                "isSuccess", true,
                "data", Map.of(
                        "orderNo", order.getOrderNo(),          // ← 추가
                        "orderId", orderId,
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

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestBody Map<String, Object> body,
                                     Authentication authentication) {
        String paymentKey = (String) body.get("paymentKey");
        String orderId    = (String) body.get("orderId");
        Number amtN       = (Number) body.get("amount");

        if (paymentKey == null || orderId == null || amtN == null) {
            return ResponseEntity.badRequest().body(Map.of("isSuccess", false, "resCode", 400, "resMessage", "invalid request"));
        }
        int clientAmount = amtN.intValue();

        Long orderNo;
        try {
            orderNo = Long.parseLong(orderId.split("-")[1]); // "ANP-{orderNo}-{ts}"
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderId 형식 오류");
        }

        OrderEntity order = orderRepository.findByIdFetchItems(orderNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문 없음"));

        String memberId = currentMemberId(authentication); // ← 안전 추출
        if (memberId != null && !memberId.equals(order.getMember().getMemberEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 주문만 결제 가능");
        }
        assertPayable(order);

        int serverAmount = computeOrderAmount(order);
        if (serverAmount <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPTY_ORDER_AMOUNT");
        if (serverAmount != clientAmount) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "금액 불일치");

        Map<String, Object> result = tossPaymentService.confirmPayment(paymentKey, orderId, serverAmount);

        order.setOrderStatus(OrderStatus.PAID);
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("isSuccess", true, "data", result));
    }
}