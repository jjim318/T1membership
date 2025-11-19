package com.t1membership.order.service;

import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.res.common.CancelOrderRes;

public interface OrderCancelService {
    /**
     * 회원용 취소/환불
     * - 주문 소유자(memberEmail) 검증
     * - {@link com.t1membership.order.constant.OrderStatus#isCancelableByUser()} 로 상태 검증
     * - CancelOrderReq.orderItemNos 에 따라 전체/부분 취소 분기
     */
    CancelOrderRes cancelByUser(String memberEmail, CancelOrderReq req);

    /**
     * 관리자용 취소/환불
     * - 주문 소유자 검증은 하지 않고, 상태만
     *   {@link com.t1membership.order.constant.OrderStatus#isCancelableByAdmin()} 로 검증
     * - CancelOrderReq.orderItemNos 에 따라 전체/부분 취소 분기
     */
    CancelOrderRes cancelByAdmin(CancelOrderReq req);
}
