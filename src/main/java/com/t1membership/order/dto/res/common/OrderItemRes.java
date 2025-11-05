package com.t1membership.order.dto.res.common;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRes {
    private Long itemNo;                     // 원본 상품 식별용
    private String itemNameSnapshot;         // 주문 당시 상품명(스냅샷)
    private String itemOptionSnapshot;       // 주문 당시 옵션(색/사이즈 등)
    private String itemImageSnapshot;        // 주문 당시 대표 이미지
    private int priceAtOrder;                // 당시 단가
    private int quantity;                    // 주문 수량
    private int lineTotal;                   // 단가 * 수량
}
