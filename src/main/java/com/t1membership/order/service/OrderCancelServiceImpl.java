package com.t1membership.order.service;

import com.t1membership.item.domain.ItemEntity;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.res.common.CancelOrderRes;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Log4j2
public class OrderCancelServiceImpl implements OrderCancelService {

    private final OrderRepository orderRepository;
    private final TossPaymentService tossPaymentService;

    // ====================================
    //  회원 - 취소/환불
    // ====================================
    @Override
    @Transactional
    public CancelOrderRes cancelByUser(String memberEmail, CancelOrderReq req) {

        if (req.getOrderNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderNo 는 필수입니다.");
        }
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "취소 사유는 필수입니다.");
        }

        // 1) 주문 + 라인 조회 (본인 주문인지까지 한 번에 검증)
        OrderEntity order = orderRepository
                .findByOrderNoAndMember_MemberEmail(req.getOrderNo(), memberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다.")); // 소유자 아니면 조회 안됨

        // 2) 상태 검증 - 사용자 취소 가능 상태인지
        OrderStatus status = order.getOrderStatus();
        if (!status.isCancelableByUser()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "현재 상태(" + status + ")에서는 회원이 직접 취소할 수 없습니다.");
        }

        // 3) 전체/부분 취소 판단
        boolean isPartial = !CollectionUtils.isEmpty(req.getOrderItemNos());

        if (isPartial) {
            return doPartialCancel(order, req, true);
        } else {
            return doFullCancel(order, req, true);
        }
    }

    // ====================================
    //  관리자 - 부분 취소
    // ====================================
    @Override
    @Transactional
    public CancelOrderRes cancelByAdmin(CancelOrderReq req) {

        if (req.getOrderNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderNo 는 필수입니다.");
        }
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "취소 사유는 필수입니다.");
        }

        // 1) 주문 + 라인 조회 (관리자는 소유자 상관없이 조회 가능)
        OrderEntity order = orderRepository
                .findByIdFetchItems(req.getOrderNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));

        // 2) 상태 검증 - 관리자 취소 가능 상태인지
        OrderStatus status = order.getOrderStatus();
        if (!status.isCancelableByAdmin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "현재 상태(" + status + ")에서는 관리자가 취소할 수 없습니다.");
        }

        // 3) 전체/부분 취소 판단
        boolean isPartial = !CollectionUtils.isEmpty(req.getOrderItemNos());

        if (isPartial) {
            return doPartialCancel(order, req, false);
        } else {
            return doFullCancel(order, req, false);
        }
    }
    // ====================================
    //  헬퍼 메서드(내부 공통 로직 - 전체 / 부분 취소
    // ====================================
    private CancelOrderRes doFullCancel(OrderEntity order, CancelOrderReq req, boolean fromUser) {

        // 1) 전체 취소 금액 = 주문 총액
        //    - orderTotalPrice 타입이 BigDecimal 이라고 가정.
        //    - 만약 int 라면 BigDecimal.valueOf(order.getOrderTotalPrice()) 로 변경 필요.
        BigDecimal cancelAmount = order.getOrderTotalPrice();

        if (cancelAmount == null || cancelAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "취소할 금액이 없습니다. (orderTotalPrice <= 0)");
        }

        String paymentKey = order.getTossPayment().getTossPaymentKey();
        if (paymentKey == null || paymentKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "결제 정보(paymentKey)가 없어 취소할 수 없습니다.");
        }
        // 2) PG(Toss) 쪽 환불 호출
        //    - TossPaymentService 쪽에서 실제 /v1/payments/{paymentKey}/cancel 호출 + 로그 남기기
        //    - 여기서는 예외 발생 시 그대로 전파해서 롤백되도록 둔다.
        try {
            Map<String, Object> tossRes =
                    tossPaymentService.cancelPayment(paymentKey, null, req.getReason());
            log.debug("[OrderCancel] Toss full cancel OK - orderNo={}, tossRes={}",
                    order.getOrderNo(), tossRes);
        } catch (Exception e) {
            log.error("[OrderCancel] Toss full cancel 실패 - orderNo={}, msg={}", order.getOrderNo(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "결제 취소(환불) 처리 중 오류가 발생했습니다.");
        }

        // 3) 주문 상태 갱신
        order.setOrderStatus(OrderStatus.CANCELED);

        // 4) 취소 시각 기록 (엔티티에 별도 필드가 있다면 세팅, 없으면 DTO 에만 담아줘도 됨)
        LocalDateTime canceledAt = LocalDateTime.now();

        // 5) TODO: 재고 롤백, 정산/회계 로그, 알림 발송 등은 별도 서비스에서 처리 권장

        // 5) 재고 롤백
        for (OrderItemEntity orderItem : order.getOrderItems()) {
            ItemEntity item = orderItem.getItem();  // 어떤 상품인지
            int qty = orderItem.getQuantity();      // 몇 개 복구할지

            // 재고 복원
            int newStock = item.getItemStock() + qty;
            item.setItemStock(newStock);

            log.info("[InventoryRollback] 상품 ID={} 재고 복구: +{} → 현재 재고={}",
                    item.getItemNo(), qty, newStock);
        }

        // 6) 응답 DTO 조립
        CancelOrderRes res = new CancelOrderRes();
        res.setOrderNo(order.getOrderNo());
        res.setOrderStatus(order.getOrderStatus());
        res.setCancelAmount(cancelAmount);
        res.setCancelReason(req.getReason());
        res.setCanceledAt(canceledAt);

        // PG 관련 필드는 TossPaymentService 에서 결과를 받아와서 세팅하고 싶다면
        // refund(...) 의 리턴값을 사용해서 채우도록 확장하시면 된다.
        // (예: tossStatus, tossMessage, paymentKey 등)

        return res;
    }

    /**
     * 부분 취소 처리
     *
     * - CancelOrderReq.orderItemNos 에 지정된 라인만 전부 취소하는 버전.
     *   ("수량 일부만 취소" 는 현재 구조상 지원하지 않고, 라인 단위 전체 취소 기준)
     *
     * @param order    취소 대상 주문 엔티티
     * @param req      취소 요청 DTO
     * @param fromUser true = 회원 취소, false = 관리자 취소
     */
    private CancelOrderRes doPartialCancel(OrderEntity order, CancelOrderReq req, boolean fromUser) {

        List<Long> targetItemNos = req.getOrderItemNos();
        if (CollectionUtils.isEmpty(targetItemNos)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "부분 취소를 위해서는 orderItemNos 가 필요합니다.");
        }

        String paymentKey = order.getTossPayment().getTossPaymentKey();
        if (paymentKey == null || paymentKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "결제 정보(paymentKey)가 없어 부분 취소를 수행할 수 없습니다.");
        }

        // 1) 중복 제거
        Set<Long> targetSet = new HashSet<>(targetItemNos);

        // 2) 주문에 속한 orderItem 들만 허용 (타인의 주문상품 ID 를 섞어 보내는 공격 방지)
        List<OrderItemEntity> orderItems = order.getOrderItems();
        if (CollectionUtils.isEmpty(orderItems)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "주문에 상품이 없습니다.");
        }

        BigDecimal cancelAmount = BigDecimal.ZERO;
        int matchedCount = 0;

        for (OrderItemEntity oi : orderItems) {
            Long orderItemNo = oi.getOrderItemNo(); // 엔티티 PK (order_item_no)

            if (targetSet.contains(orderItemNo)) {
                matchedCount++;

                // 라인 단위 금액 계산
                // priceAtOrder * quantity 또는 lineTotal 을 바로 사용
                BigDecimal lineTotal = oi.getLineTotal(); // int 타입이면 BigDecimal.valueOf(...) 로 변환

                if (lineTotal == null || lineTotal.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "취소 대상 상품의 금액이 0 이하입니다. (orderItemNo=" + orderItemNo + ")");
                }

                cancelAmount = cancelAmount.add(lineTotal);

                // TODO: 부분 취소 시
                //  - 이 라인을 "취소됨" 으로 마킹하는 컬럼(예: lineStatus, canceledYn 등)이 있다면 여기서 세팅
                //  - 또는 별도 OrderCancelItemLog 에 기록
            }
        }

        if (matchedCount != targetSet.size()) {
            // 요청한 orderItemNo 중 일부는 이 주문에 속하지 않음
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "요청한 주문상품 번호 중 일부는 해당 주문에 속하지 않습니다.");
        }

        if (cancelAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "부분 취소 금액이 0원입니다. (계산 결과)");
        }

        // 3) PG(Toss) 환불 호출 (부분 취소 금액 기준)
        int cancelAmountInt;
        try {
            cancelAmountInt = cancelAmount.intValueExact(); // 소수점/오버플로우 있으면 예외
        } catch (ArithmeticException e) {
            log.error("[OrderPartialCancel] cancelAmount 변환 실패 - orderNo={}, amount={}", order.getOrderNo(), cancelAmount, e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "부분 취소 금액이 허용 범위를 벗어나거나 소수점이 포함돼 있습니다.");
        }

        // 4) PG(Toss) 환불 호출 (부분 취소 금액 기준)
        try {
            Map<String, Object> tossRes =
                    tossPaymentService.cancelPayment(paymentKey, cancelAmountInt, req.getReason());
            log.debug("[OrderPartialCancel] Toss partial cancel OK - orderNo={}, amount={}, tossRes={}",
                    order.getOrderNo(), cancelAmountInt, tossRes);
        } catch (Exception e) {
            log.error("[OrderPartialCancel] Toss 환불 실패 - orderNo={}, msg={}", order.getOrderNo(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "결제 부분 취소(환불) 처리 중 오류가 발생했습니다.");
        }

        // 5) 주문 상태 갱신
        //   - 나머지 상품이 남아 있으므로 PARTIALLY_CANCELED 로 마킹
        order.setOrderStatus(OrderStatus.PARTIALLY_CANCELED);
        LocalDateTime canceledAt = LocalDateTime.now();

        // TODO: 재고 롤백 (부분 취소된 상품만 수량 복구)
        // TODO: 회계/정산 로그, 알림 / 히스토리 로그

        // 6) 재고 롤백 (부분 취소된 상품만 처리)
        for (OrderItemEntity oi : orderItems) {
            if (targetSet.contains(oi.getOrderItemNo())) { // 요청된 아이템만
                ItemEntity item = oi.getItem();
                int qty = oi.getQuantity();

                int newStock = item.getItemStock() + qty;
                item.setItemStock(newStock);

                log.info("[InventoryRollback] 부분취소 - 상품 ID={} 재고 복구: +{} → 현재 재고={}",
                        item.getItemNo(), qty, newStock);
            }
        }

        // 6) 응답 DTO 조립
        CancelOrderRes res = new CancelOrderRes();
        res.setOrderNo(order.getOrderNo());
        res.setOrderStatus(order.getOrderStatus());
        res.setCancelAmount(cancelAmount);
        res.setCancelReason(req.getReason());
        res.setCanceledAt(canceledAt);

        return res;
    }
}
