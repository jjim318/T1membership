package com.t1membership.cart.dto.prepareOrder;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Builder @AllArgsConstructor @NoArgsConstructor
public class PrepareOrderRes {
    private List<Line> lines;     // 결제 요약 라인
    private int totalQuantity;    // 총 수량
    private BigDecimal totalAmount;      // 총 금액
    private boolean ok;           // 결제 진행 가능 여부
    private List<Violation> violations; // 차단/경고 사유 목록

    @Getter @Builder @AllArgsConstructor @NoArgsConstructor
    public static class Line {
        private Long itemNo;
        private String itemName;
        private BigDecimal unitPrice;   // 현재가
        private int quantity;    // 카트에 담긴 수량
        private BigDecimal lineAmount;  // unitPrice * quantity
    }

    @Getter @Builder @AllArgsConstructor @NoArgsConstructor
    public static class Violation {
        private Long itemNo;
        private String code;     // NOT_FOUND_IN_CART, OUT_OF_STOCK, NOT_SELLABLE, ...
        private String message;
    }
}
