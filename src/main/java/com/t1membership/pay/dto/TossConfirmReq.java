package com.t1membership.pay.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TossConfirmReq {
    /** 토스에서 준 키 (명세: paymentKey) */
    private String paymentKey; // successUrl 쿼리에서 옴
    /** 금액 검증용(원) */
    private Integer totalAmount;  // successUrl 쿼리 그대로
    /** 토스 결제 시작 시 사용한 orderId (예: "ANP-20-1733212345678") */
    private String orderId;
}
