package com.t1membership.order.dto.req.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelOrderReq {//주문 취소
    @NotNull
    private Long orderNo;//주문번호
    @NotBlank
    private String reason;//주문취소 사유
}
