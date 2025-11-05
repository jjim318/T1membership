package com.t1membership.order.dto.res.common;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrderAddressRes {
    //배송관련 수정
    private Long orderNo;  // 주문 번호

    // 수정된 배송지 정보
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String receiverDetailAddress;
    private String receiverZipCode;
    private String memo;

}
