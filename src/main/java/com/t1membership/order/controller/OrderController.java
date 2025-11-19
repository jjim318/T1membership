package com.t1membership.order.controller;

import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.req.common.SearchOrderReq;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import com.t1membership.order.dto.req.user.CreatePopOrderReq;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.dto.res.user.UserDetailOrderRes;
import com.t1membership.order.service.OrderQueryService;
import com.t1membership.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
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
    public ResponseEntity<Page<SummaryOrderRes>> getMyOrders(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "10") int size) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        Pageable pageable = PageRequest.of(page, size);
        Page<SummaryOrderRes> res = orderQueryService.getMyOrders(email, pageable);

        return ResponseEntity.ok(res);
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

    // 주문 생성 (멤버십)
    @PostMapping("/membership")
    public CreateOrderRes createMembershipOrders(@AuthenticationPrincipal String email,
                                                 @RequestBody @Valid CreateMembershipOrderReq req) {
        return orderService.createMembershipOrder(email, req);
    }

    // 주문 생성 (POP)
    @PostMapping("/POP")
    public CreateOrderRes createPopOrders(@AuthenticationPrincipal String email,
                                          @RequestBody @Valid CreatePopOrderReq req) {
        return orderService.createPopOrder(email, req);
    }

    //주문 취소
    @PatchMapping("/cancel")
    public ResponseEntity<UserDetailOrderRes> cancelMyOrder(
            @AuthenticationPrincipal String email,
            @RequestBody @Valid CancelOrderReq req) {

        // 회원은 부분취소 금지!
        req.setOrderItemNos(null);

        UserDetailOrderRes res = orderService.cancelMyOrder(email, req);

        return ResponseEntity.ok(res);
    }
}