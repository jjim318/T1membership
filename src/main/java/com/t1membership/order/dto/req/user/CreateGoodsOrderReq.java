package com.t1membership.order.dto.req.user;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGoodsOrderReq implements CreateOrderReq.Payload{
    //굿즈 주문 생성(payload구현체

    // 단건 or 장바구니 중 1개 방식만 채택
    private Long itemId;                 // 단건일 때
    @Min(1)
    private Integer quantity;            // 단건일 때
    private List<Long> cartItemIds;      // 장바구니 선택형일 때

    @NotNull
    private Long cartNo;//장바구니 번호
    @NotBlank
    private String receiverName;//받는 분 이름
    @NotBlank
    @Pattern(regexp = "^[0-9\\-]{9,13}$")
    private String receiverPhone;//받는 분 번호
    @NotBlank
    private String receiverAddress;//받는 분 주소
    @NotBlank
    private String receiverDetailAddress;//받는 분 상세주소
    @NotBlank
    private String receiverZipCode;//받는 분 우편번호
    @Size(max = 200)
    private String memo;//요청사항
}
