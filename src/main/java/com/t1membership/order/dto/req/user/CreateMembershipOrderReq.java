package com.t1membership.order.dto.req.user;

import com.t1membership.order.constant.MembershipPayType;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMembershipOrderReq implements CreateOrderReq.Payload{

    @NotNull
    private String planCode; //멤버십 상품 코드
    @NotNull @Min(1)
    private Integer months; //플랜 정책에 따라 다양

    private boolean autoRenew; //true면 정기결제(구독), false면 단건

    @NotNull
    private MembershipPayType membershipPayType;

    //멤버쉽 주문 생성(payload구현체
    @NotBlank
    private String memberBirth;//멤버쉽 생일
    @NotBlank
    private String memberName;//멤버쉽 이름
    @NotBlank
    private String memberPhone;//멤버쉽 번호

}
