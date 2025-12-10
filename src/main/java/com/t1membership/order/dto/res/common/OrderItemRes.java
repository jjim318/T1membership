package com.t1membership.order.dto.res.common;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRes {
    // 🔥 주문 라인 PK (부분 취소용)
    private Long orderItemNo;

    private Long itemNo;                     // 원본 상품 식별용
    private String itemNameSnapshot;         // 주문 당시 상품명(스냅샷)
    private String itemOptionSnapshot;       // 주문 당시 옵션(색/사이즈 등)
    private String itemImageSnapshot;        // 주문 당시 대표 이미지
    private BigDecimal priceAtOrder;                // 당시 단가
    private int quantity;                    // 주문 수량
    private BigDecimal lineTotal;                   // 단가 * 수량

    // 🔥 주문 당시 상품 카테고리 스냅샷 (MD / POP / MEMBERSHIP ...)
    private String itemCategorySnapshot;
}
