package com.t1membership.order.dto.req.user;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMembershipOrderReq implements CreateOrderReq.Payload{

    @NotNull private String planCode;
    @NotNull @Min(1) private Integer months;
    private boolean autoRenew;

    //멤버쉽 주문 생성(payload구현체
    @NotNull
    private Long cartNo;//장바구니 번호(결제 번호
    @NotBlank
    private String memberBirth;//멤버쉽 생일
    @NotBlank
    private String memberName;//멤버쉽 이름
    @NotBlank
    private String memberPhone;//멤버쉽 번호

}
