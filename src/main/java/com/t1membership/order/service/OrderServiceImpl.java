package com.t1membership.order.service;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import com.t1membership.order.dto.req.user.CreateOrderReq;
import com.t1membership.order.dto.req.user.CreatePopOrderReq;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.dto.res.user.UserDetailOrderRes;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.dto.TossPrepareRes;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {
    //주문 서비스 구현체(유저용
    private final OrderRepository orderRepository;
    private final GoodsOrderCreator goodsOrderCreator;
    private final TossPaymentService tossPaymentService;
    private final MembershipOrderCreator membershipOrderCreator;
    private final PopOrderCreator popOrderCreator;

    /**
     * BigDecimal → int (원 단위) 변환
     * - 소수점 있거나 int 범위 넘으면 예외
     */
    private int toKrwInt(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("금액이 비어 있습니다.");
        }
        try {
            return amount.intValueExact();
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException("금액(BigDecimal)을 int로 변환할 수 없습니다. amount=" + amount, e);
        }
    }

    /**
     * 주문명 생성
     * - 토스 createPaymentUrl 에만 사용 (응답 DTO에는 굳이 넣지 않음)
     */
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
     * 공통 처리:
     * - 주문 저장
     * - 토스 결제창 URL 생성
     * - CreateOrderRes 조립
     */
    private CreateOrderRes processOrder(OrderEntity order) {

        // 1) DB 저장 (PK 생성 + orderItems cascade)
        orderRepository.save(order);

        // 2) 토스에 보낼 값 준비
        int amount    = toKrwInt(order.getOrderTotalPrice());
        String orderId   = order.getOrderNo().toString();
        String orderName = buildOrderName(order);

        // 3) 토스 결제창 URL 생성
        String checkoutUrl = tossPaymentService.createPaymentUrl(
                orderId,
                amount,
                orderName
        );

        // 4) DTO 정적 팩토리로 응답 생성
        return CreateOrderRes.from(order, checkoutUrl);
    }

    // ======================
    // 1) 굿즈 주문 생성
    // ======================
    @Override
    @Transactional
    public CreateOrderRes createGoodsOrder(String memberEmail, CreateGoodsOrderReq req) {

        // 주문 도메인 생성 (Creator가 담당)
        OrderEntity order = goodsOrderCreator.create(memberEmail, req);

        // 공통 처리 + 응답
        return processOrder(order);
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

    //주문전체취소(환불

    //주문부분취소(환불
    @Override
    @Transactional
    public UserDetailOrderRes cancelMyOrder(String memberEmail, CancelOrderReq req) {

        Long orderNo = req.getOrderNo();

        // 1) 내 주문인지 검증 + orderItems fetch
        OrderEntity order = orderRepository
                .findByOrderNoAndMember_MemberEmail(orderNo, memberEmail)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));

        // 회원 쪽은 무조건 전체 취소만 허용
        if (order.getOrderStatus() == OrderStatus.PAID) {
            tossPaymentService.cancelPayment(order, req.getReason());
        }

        order.cancelByUser();

        return UserDetailOrderRes.from(order);
    }

}
