package com.t1membership.order.service;

import com.t1membership.order.dto.req.admin.AdminUpdateOrderAddressReq;
import com.t1membership.order.dto.req.admin.AdminUpdateOrderStatusReq;
import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.res.admin.AdminDetailOrderRes;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.common.UpdateOrderAddressRes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminOrderService {
    //관리자용 주문 서비스 인터페이스

    //배송지 변경
    UpdateOrderAddressRes updateAddress(AdminUpdateOrderAddressReq req);

    //주문 상태 변경
    AdminDetailOrderRes updateStatus(AdminUpdateOrderStatusReq req);

    // 주문 전체 취소
    AdminDetailOrderRes cancelOrder(CancelOrderReq req);

}
