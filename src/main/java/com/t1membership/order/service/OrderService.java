package com.t1membership.order.service;

import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import com.t1membership.order.dto.req.user.CreatePopOrderReq;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import com.t1membership.order.dto.res.user.UserDetailOrderRes;

public interface OrderService {
    //주문 서비스 인터페이스(유저용

    CreateOrderRes createGoodsOrder(String memberEmail, CreateGoodsOrderReq req);

    CreateOrderRes createMembershipOrder(String memberEmail, CreateMembershipOrderReq req);

    CreateOrderRes createPopOrder(String memberEmail, CreatePopOrderReq req);
}
