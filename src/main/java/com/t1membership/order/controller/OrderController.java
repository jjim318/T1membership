package com.t1membership.order.controller;

import com.t1membership.order.dto.req.common.SearchOrderReq;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.dto.res.user.UserDetailOrderRes;
import com.t1membership.order.service.OrderQueryService;
import com.t1membership.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {
    
    private final OrderQueryService orderQueryService;
    private final OrderService orderService;

    //유저용
    //주문 생성,주문 조회, 주문 취소(환불)

    // 내 주문 목록 조회
    @GetMapping("/my_orders")
    public Page<SummaryOrderRes> getMyOrders(@AuthenticationPrincipal String email,
                                             Pageable pageable) {
        return orderQueryService.getMyOrders(email, pageable);
    }

    // 내 주문 상세
    @GetMapping("/{orderNo}")
    public UserDetailOrderRes getMyOrderDetail(@AuthenticationPrincipal String email,
                                               @PathVariable Long orderNo) {
        return orderQueryService.getUserDetail(email, orderNo);
    }

    // 주문 생성 (굿즈)
    @PostMapping("/goods")
    public CreateOrderRes createGoodsOrder(@AuthenticationPrincipal String email,
                                           @RequestBody @Valid CreateGoodsOrderReq req) {
        return orderService.createGoodsOrder(email, req);
    }
}