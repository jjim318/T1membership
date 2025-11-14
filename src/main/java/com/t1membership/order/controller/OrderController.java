package com.t1membership.order.controller;

import com.t1membership.order.service.OrderServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {
    //유저용
    //주문 생성,주문 조회, 주문 취소(환불)
    private final OrderServiceImpl orderService;
}