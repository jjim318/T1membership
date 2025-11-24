package com.t1membership.order.dto.req.user;

import com.t1membership.item.constant.Player;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePopOrderReq implements CreateOrderReq.Payload{
    //pop 채팅 주문 생성(payload구현체
    @NotNull
    private Long popId;
    @NotNull @Min(1) private Integer quantity;
    private String variant; // 옵션/버전

}
