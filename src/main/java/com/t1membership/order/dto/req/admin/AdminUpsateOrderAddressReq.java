package com.t1membership.order.dto.req.admin;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpsateOrderAddressReq {
    //관리자 배송지 변경 요청
    private Long orderNo;  // 주문 번호

    // 수정된 배송지 정보
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String receiverDetailAddress;
    private String receiverZipCode;
}
