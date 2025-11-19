package com.t1membership.order.controller;

import com.t1membership.order.dto.req.admin.AdminUpdateOrderAddressReq;
import com.t1membership.order.dto.req.admin.AdminUpdateOrderStatusReq;
import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.res.admin.AdminDetailOrderRes;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.common.UpdateOrderAddressRes;
import com.t1membership.order.service.AdminOrderService;
import com.t1membership.order.service.OrderQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/order")
@RequiredArgsConstructor
public class AdminOrderController {
    private final AdminOrderService adminOrderService;
    private final OrderQueryService orderQueryService;
    //관리자용
    //주문 검색, 상세 조회, 상태 변경(승인/취소)

    //관리자용 주문 목록 조회 (간단 버전: 페이지 + 정렬은 나중에)
    @GetMapping
    public ResponseEntity<Page<SummaryOrderRes>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<SummaryOrderRes> res = orderQueryService.getAllOrderAdmin(pageable);
        return ResponseEntity.ok(res);
    }

    //관리자 주문 상세
    @GetMapping("/{orderNo}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminDetailOrderRes> getOrderDetail(@PathVariable Long orderNo) {
        AdminDetailOrderRes res = orderQueryService.getAdminDetail(orderNo);
        return ResponseEntity.ok(res);
    }

    //배송지 변경
    @PatchMapping("/address")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UpdateOrderAddressRes> updateAddress(
            @RequestBody @Valid AdminUpdateOrderAddressReq req) {

        UpdateOrderAddressRes res = adminOrderService.updateAddress(req);
        return ResponseEntity.ok(res);
    }

    //상태 변경 (배송 준비 / 배송 중 등)
    @PatchMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminDetailOrderRes> updateStatus(
            @RequestBody @Valid AdminUpdateOrderStatusReq req) {

        AdminDetailOrderRes res = adminOrderService.updateStatus(req);
        return ResponseEntity.ok(res);
    }

    //관리자 취소
    @PatchMapping("/cancel")
    @PreAuthorize("hasRole('ADMIN')") // 시큐리티에서 ROLE_ADMIN 보장
    public ResponseEntity<AdminDetailOrderRes> cancelOrderByAdmin(
            @RequestBody CancelOrderReq req) {

        //서비스로 넘겨서 비즈니스 로직 + 트랜잭션은 서비스 계층에서 처리
        AdminDetailOrderRes res = adminOrderService.cancelOrder(req);

        return ResponseEntity.ok(res);
    }
}
