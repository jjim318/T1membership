package com.t1membership.order.controller;

import com.t1membership.ApiResult;
import com.t1membership.item.constant.ItemCategory;
import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.req.common.SearchOrderReq;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import com.t1membership.order.dto.req.user.CreateOrderReq;
import com.t1membership.order.dto.req.user.CreatePopOrderReq;
import com.t1membership.order.dto.res.common.CancelOrderRes;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.dto.res.user.UserDetailOrderRes;
import com.t1membership.order.service.OrderCancelService;
import com.t1membership.order.service.OrderQueryService;
import com.t1membership.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;


@RestController
@RequestMapping("/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrderQueryService orderQueryService;
    private final OrderService orderService;
    private final OrderCancelService orderCancelService;

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
    public ApiResult<CreateOrderRes> createGoodsOrder(
            @AuthenticationPrincipal String email,
            @RequestBody @Valid CreateOrderReq req
    ) {
        if (req.getType() != ItemCategory.MD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "굿즈 주문(type=MD)만 가능합니다.");
        }

        CreateGoodsOrderReq goodsReq = (CreateGoodsOrderReq) req.getPayload();

        CreateOrderRes res = orderService.createGoodsOrder(email, goodsReq);
        return new ApiResult<>(res);
    }

    // 주문 생성 (멤버십)
    @PostMapping("/membership")
    public ApiResult<CreateOrderRes> createMembershipOrders(@AuthenticationPrincipal String email,
                                                 @RequestBody @Valid CreateMembershipOrderReq req) {
        CreateOrderRes res = orderService.createMembershipOrder(email, req);
        return new ApiResult<>(res);
    }

    // 주문 생성 (POP)
    @PostMapping("/POP")
    public ApiResult<CreateOrderRes> createPopOrders(@AuthenticationPrincipal String email,
                                          @RequestBody @Valid CreatePopOrderReq req) {
        CreateOrderRes res = orderService.createPopOrder(email, req);
        return new ApiResult<>(res);
    }

    // 회원 전체 취소
    @PatchMapping("/cancel/all")
    public ResponseEntity<CancelOrderRes> cancelMyOrderAll(
            @AuthenticationPrincipal String email,
            @RequestBody @Valid CancelOrderReq req) {

        req.setOrderItemNos(null); // 전체 취소 의미
        CancelOrderRes res = orderCancelService.cancelByUser(email, req);
        return ResponseEntity.ok(res);
    }

    // 회원 부분 취소
    @PatchMapping("/{orderNo}/cancel-items")
    public ResponseEntity<CancelOrderRes> cancelMyOrderItems(
            @AuthenticationPrincipal String memberEmail,   // 🔥 여기만 수정
            @PathVariable Long orderNo,
            @RequestBody @Valid CancelOrderReq req
    ) {

        // 1) path 의 orderNo 를 body 에 강제 세팅
        req.setOrderNo(orderNo);

        // 2) 부분취소 검증
        List<Long> orderItemNos = req.getOrderItemNos();
        if (orderItemNos == null || orderItemNos.isEmpty()) {
            throw new IllegalArgumentException("부분 취소를 위해서는 orderItemNos 가 1개 이상 필요합니다.");
        }

        // 3) 서비스 호출 (회원용 취소)
        CancelOrderRes res = orderCancelService.cancelByUser(memberEmail, req);

        // 4) 결과 반환
        return ResponseEntity.ok(res);
    }

}