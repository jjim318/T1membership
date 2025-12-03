package com.t1membership.pay.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossPrepareRes {
    /** 토스에 넘길 상점주문번호(문자열) */
    private String orderNo;
    /** 화면표시용 주문명(토스 위젯 orderName) */
    private String orderName;
    /** 결제 금액(원) */
    private Integer totalAmount;
}
