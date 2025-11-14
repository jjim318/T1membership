package com.t1membership.order.service;

import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.dto.TossPrepareRes;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {
    //주문 서비스 구현체(유저용
    private final OrderRepository orderRepository;
    private final GoodsOrderCreator goodsOrderCreator;
    private final TossPaymentService tossPaymentService;
    private final MembershipOrderCreator membershipOrderCreator;

    //주문생성(굿즈
    @Transactional
    public CreateOrderRes createOrder(String memberId, CreateGoodsOrderReq req) {

        // 1) 주문 생성
        OrderEntity order = goodsOrderCreator.create(memberId, req);

        // 2) Toss 결제 준비
        TossPrepareResult toss = tossPaymentService.prepare(
                order.getId().toString(),
                order.getTotalAmount()
        );

        // 3) 클라이언트로 보낼 DTO 조립
        return orderMapper.toCreateOrderRes(order, toss);
    }

    //주문생성(멤버십
    @Transactional
    public CreateOrderRes createMembershipOrder(String memberEmail, CreateMembershipOrderReq req) {

        OrderEntity order = membershipOrderCreator.create(memberEmail, req);

        // 여기서만 저장
        orderRepository.save(order);

        TossPrepareResult toss = tossPaymentService.prepare(
                order.getId().toString(),
                order.getTotalAmount()
        );

        return orderMapper.toCreateOrderRes(order, toss);
    }
    //주문조회(회원

    //주문조회(관리자

    //주문상세조회(회원,관리자

    //주문전체취소(환불

    //주문부분취소(환불
}
