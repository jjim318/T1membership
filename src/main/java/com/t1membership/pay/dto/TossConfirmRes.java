// TossConfirmRes.java
package com.t1membership.pay.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossConfirmRes {
    private String orderId;       // 문자열(= orderTossId)
    private Integer approvedAmount;  // 승인 금액
    private String method;        // CARD / TRANSFER / VIRTUAL_ACCOUNT / ...
    private String orderName;     // 표기용
    private String status;        // PAID 등
}
