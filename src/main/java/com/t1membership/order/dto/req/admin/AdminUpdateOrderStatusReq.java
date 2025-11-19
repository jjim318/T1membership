package com.t1membership.order.dto.req.admin;

import com.t1membership.order.constant.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateOrderStatusReq {
    //관리자 주문 상태 변경 요청

    @NotNull
    private Long orderNo;//주문 번호

    @NotNull
    private OrderStatus orderStatus;//주문 상태 변경 가능
}
