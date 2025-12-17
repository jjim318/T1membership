package com.t1membership.order.service;

import com.t1membership.cart.repository.CartRepository;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import com.t1membership.order.dto.req.user.CreatePopOrderReq;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.constant.TossPaymentMethod;
import com.t1membership.pay.constant.TossPaymentStatus;
import com.t1membership.pay.domain.TossPaymentEntity;
import com.t1membership.pay.repository.TossPaymentRepository;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {
    //주문 서비스 구현체(유저용
    private final OrderRepository orderRepository;
    private final GoodsOrderCreator goodsOrderCreator;
    private final TossPaymentService tossPaymentService;
    private final MembershipOrderCreator membershipOrderCreator;
    private final PopOrderCreator popOrderCreator;
    private final CartRepository cartRepository;
    private final TossPaymentRepository tossPaymentRepository;

    // ===========================
    // BigDecimal → int 변환 (토스 amount용)
    // ===========================
    private int toKrwInt(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("금액이 비어 있습니다.");
        }
        try {
            return amount.intValueExact();
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException(
                    "금액(BigDecimal)을 int로 변환할 수 없습니다. amount=" + amount, e);
        }
    }

    // ===========================
    // 주문명 생성 (토스 orderName)
    // ===========================
    private String buildOrderName(OrderEntity order) {
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            return "T1 주문";
        }

        OrderItemEntity first = order.getOrderItems().get(0);
        String baseName = first.getItemNameSnapshot() != null
                ? first.getItemNameSnapshot()
                : "T1 상품";

        int size = order.getOrderItems().size();
        if (size == 1) {
            return baseName;
        }
        return baseName + " 외 " + (size - 1) + "건";
    }

    /**
     * 공통 처리
     *  1) 주문 저장
     *  2) 토스 결제창 URL 생성
     *  3) CreateOrderRes 생성
     */
    private CreateOrderRes processOrder(OrderEntity order) {

        // 1) 주문 저장 (PK 생성 + orderItems cascade)
        orderRepository.save(order);

        // 2) 토스에 보낼 값 준비
        int amount = toKrwInt(order.getOrderTotalPrice());
        String orderName = buildOrderName(order);

        // ✅ [핵심] 토스 orderId는 "DB에 저장되는 결제 준비 레코드"의 키여야 한다
        //    - 추천: 주문종류 Prefix + orderNo (절대 안 꼬임)
        String orderTossId = "ORD_" + order.getOrderNo();

        // ✅ [핵심] toss_payment(READY) 생성/저장 (nullable=false 필드 절대 null 금지)
        //    이미 있으면(재시도/중복 클릭) 멱등으로 처리
        tossPaymentRepository.findByOrderTossId(orderTossId).orElseGet(() -> {
            TossPaymentEntity pay = TossPaymentEntity.builder()
                    .order(order)
                    .orderTossId(orderTossId)
                    .orderName(orderName)
                    .totalAmount(order.getOrderTotalPrice())
                    .tossPaymentMethod(TossPaymentMethod.CARD)          // nullable=false
                    .tossPaymentStatus(TossPaymentStatus.PENDING)         // nullable=false
                    .build();
            return tossPaymentRepository.save(pay);
        });

        log.info("[PAY READY] orderNo={}, orderTossId={}, amount={}", order.getOrderNo(), orderTossId, amount);

        try {
            // 3) 토스 결제창 URL 생성 (orderId = orderTossId로!)
            String checkoutUrl = tossPaymentService.createPaymentUrl(
                    orderTossId,
                    amount,
                    orderName
            );

            // 4) 응답 DTO 생성
            return CreateOrderRes.from(order, checkoutUrl);

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("[Order] Toss createPaymentUrl 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString(), e);

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "결제정보 생성 오류 : http=" + e.getStatusCode()
            );

        } catch (RestClientException e) {
            log.error("[Order] Toss 통신 오류", e);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "결제 서버와 통신 중 오류가 발생했습니다."
            );

        } catch (Exception e) {
            log.error("[Order] 알 수 없는 결제 오류", e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "결제정보 생성 중 알 수 없는 오류가 발생했습니다."
            );
        }
    }

    // ======================
    // 1) 굿즈 주문 생성
    // ======================
    @Override
    @Transactional
    public CreateOrderRes createGoodsOrder(String memberEmail, CreateGoodsOrderReq req) {

        // 1) 주문 도메인 생성 (Creator가 담당)
        OrderEntity order = goodsOrderCreator.create(memberEmail, req);

        // 2) 공통 처리 + 토스 결제 URL 생성
        CreateOrderRes res = processOrder(order);

        // 3) 🔥 장바구니 기반 주문이었다면, 장바구니 비우기
        if (req.getCartItemIds() != null && !req.getCartItemIds().isEmpty()) {
            cartRepository.deleteAllByIdInBatch(req.getCartItemIds());
            // 또는 cartRepository.deleteAllById(req.getCartItemIds());
        }

        return res;
    }

    // ======================
    // 2) 멤버십 주문 생성
    // ======================
    @Override
    @Transactional
    public CreateOrderRes createMembershipOrder(String memberEmail, CreateMembershipOrderReq req) {

        OrderEntity order = membershipOrderCreator.create(memberEmail, req);

        return processOrder(order);
    }

    // ======================
    // 3) POP 주문 생성
    // ======================
    @Override
    @Transactional
    public CreateOrderRes createPopOrder(String memberEmail, CreatePopOrderReq req) {

        OrderEntity order = popOrderCreator.create(memberEmail, req);

        return processOrder(order);
    }
}
