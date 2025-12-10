package com.t1membership.order.service;

import com.t1membership.item.constant.ItemCategory;
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
//  헬퍼 메서드(내부 공통 로직 - 전체 취소)
// ====================================
    private CancelOrderRes doFullCancel(OrderEntity order, CancelOrderReq req, boolean fromUser) {

        // 1) 전체 취소 금액 = 주문 총액
        BigDecimal cancelAmount = order.getOrderTotalPrice();
        if (cancelAmount == null || cancelAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "취소할 금액이 없습니다. (orderTotalPrice <= 0)");
        }

        // 2) 현재 주문 상태
        OrderStatus status = order.getOrderStatus();

        // 3) PG 환불이 필요한 상태인지 (PAID / PROCESSING)
        boolean needPgCancel =
                status == OrderStatus.PAID ||
                        status == OrderStatus.PROCESSING;   // 필요하면 SHIPMENT_READY 추가 가능

        // 4) paymentKey 안전하게 꺼내기
        String paymentKey = null;
        if (order.getTossPayment() != null) {
            String key = order.getTossPayment().getTossPaymentKey();
            if (key != null && !key.isBlank()) {
                paymentKey = key;
            }
        }

        // 5) Toss 환불 처리
        if (needPgCancel && paymentKey != null) {
            // 정상 결제 + paymentKey 있음 → Toss에 실제 환불 요청
            try {
                Map<String, Object> tossRes =
                        tossPaymentService.cancelPayment(paymentKey, null, req.getReason());
                log.debug("[OrderCancel] Toss full cancel OK - orderNo={}, tossRes={}",
                        order.getOrderNo(), tossRes);
            } catch (Exception e) {
                log.error("[OrderCancel] Toss full cancel 실패 - orderNo={}, msg={}",
                        order.getOrderNo(), e.getMessage(), e);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "결제 취소(환불) 처리 중 오류가 발생했습니다.");
            }
        } else if (needPgCancel) {
            // 🔥 PAID/PROCESSING 인데 paymentKey 가 없으면 → 테스트/수동 생성 주문일 가능성
            log.warn("[OrderCancel] 상태={} 인데 paymentKey 없음, Toss 환불 없이 내부만 취소 진행. orderNo={}",
                    status, order.getOrderNo());
            // ❗ 여기서는 예외 던지지 않고 그냥 내부 취소만 진행
        } else {
            // ORDERED 등, PG 결제 전 상태
            log.info("[OrderCancel] PG 결제 없이 주문 취소 - orderNo={}, status={}",
                    order.getOrderNo(), status);
        }

        // 6) 주문 상태 갱신
        order.setOrderStatus(OrderStatus.CANCELED);

        // 7) 취소 시각 기록
        LocalDateTime canceledAt = LocalDateTime.now();

        // 8) 재고 롤백
        for (OrderItemEntity orderItem : order.getOrderItems()) {
            ItemEntity item = orderItem.getItem();
            int qty = orderItem.getQuantity();

            int newStock = item.getItemStock() + qty;
            item.setItemStock(newStock);

            log.info("[InventoryRollback] 상품 ID={} 재고 복구: +{} → 현재 재고={}",
                    item.getItemNo(), qty, newStock);
        }

        // 9) 응답 DTO 조립
        CancelOrderRes res = new CancelOrderRes();
        res.setOrderNo(order.getOrderNo());
        res.setOrderStatus(order.getOrderStatus());
        res.setCancelAmount(cancelAmount);
        res.setCancelReason(req.getReason());
        res.setCanceledAt(canceledAt);
        // 필요하면 paymentKey, tossStatus, tossMessage 도 여기에 세팅

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

        // 1) orderItemNos → 실제 라인 찾기
        Set<Long> targetSet = new HashSet<>(targetItemNos);

        List<OrderItemEntity> orderItems = order.getOrderItems();
        if (CollectionUtils.isEmpty(orderItems)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "주문에 상품이 없습니다.");
        }

        List<OrderItemEntity> targetLines = orderItems.stream()
                .filter(oi -> targetSet.contains(oi.getOrderItemNo()))
                .toList();

        if (targetLines.size() != targetSet.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "요청한 주문상품 번호 중 일부는 해당 주문에 속하지 않습니다.");
        }

        // 🔥 MD 아닌 상품 섞여 있으면 취소 불가
        boolean hasNonMd = targetLines.stream()
                .anyMatch(oi -> oi.getItemCategorySnapshot() != ItemCategory.MD);

        if (hasNonMd) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "MD 상품만 취소/환불이 가능합니다.");
        }

        // 2) 부분 취소 금액 계산
        BigDecimal cancelAmount = BigDecimal.ZERO;

        for (OrderItemEntity oi : targetLines) {
            BigDecimal lineTotal = oi.getLineTotal();
            if (lineTotal == null || lineTotal.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "취소 대상 상품의 금액이 0 이하입니다. (orderItemNo=" + oi.getOrderItemNo() + ")");
            }
            cancelAmount = cancelAmount.add(lineTotal);
        }

        if (cancelAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "부분 취소 금액이 0원입니다. (계산 결과)");
        }

        // 3) paymentKey 있는지 확인 (전체취소와 동일 패턴)
        String paymentKey = null;
        if (order.getTossPayment() != null) {
            String key = order.getTossPayment().getTossPaymentKey();
            if (key != null && !key.isBlank()) {
                paymentKey = key;
            }
        }

        // 🔥 Toss 환불이 필요한 상태인지
        OrderStatus status = order.getOrderStatus();
        boolean needPgCancel =
                status == OrderStatus.PAID ||
                        status == OrderStatus.PROCESSING;

        if (needPgCancel && paymentKey != null) {
            // 실제 Toss 부분 환불
            try {
                tossPaymentService.cancelPayment(
                        paymentKey,
                        cancelAmount.intValueExact(),
                        req.getReason()
                );
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "결제 부분 취소(환불) 처리 중 오류가 발생했습니다.");
            }
        } else if (needPgCancel) {
            // 🔥 결제는 된 상태인데 paymentKey 없음 → 테스트 주문이라고 보고 내부만 처리
            log.warn("[OrderCancel] 부분취소 상태={} paymentKey 없음 → Toss 환불 없이 내부 처리. orderNo={}",
                    status, order.getOrderNo());
        }

        // 4) 주문 상태 갱신
        order.setOrderStatus(OrderStatus.PARTIALLY_CANCELED);
        LocalDateTime canceledAt = LocalDateTime.now();

        // 5) 재고 롤백 (부분 취소 대상 라인만)
        for (OrderItemEntity oi : targetLines) {
            ItemEntity item = oi.getItem();
            int qty = oi.getQuantity();
            item.setItemStock(item.getItemStock() + qty);
        }

        // 6) 응답 조립
        CancelOrderRes res = new CancelOrderRes();
        res.setOrderNo(order.getOrderNo());
        res.setOrderStatus(order.getOrderStatus());
        res.setCancelAmount(cancelAmount);
        res.setCancelReason(req.getReason());
        res.setCanceledAt(canceledAt);

        return res;
    }

}
