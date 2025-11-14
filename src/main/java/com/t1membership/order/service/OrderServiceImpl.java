package com.t1membership.order.service;

import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {
    //주문 서비스 구현체(유저용
    private final OrderRepository orderRepository;

    //주문생성
    @Transactional
    public CreateOrderRes createOrder(CreateGoodsOrderReq createOrderReq) {

        OrderEntity orderEntity = OrderEntity.builder()

                .build();

        return CreateOrderRes.from(orderEntity);
    }
    //주문조회(회원

    //주문조회(관리자

    //주문상세조회(회원,관리자

    //주문전체취소(환불

    //주문부분취소(환불
}
