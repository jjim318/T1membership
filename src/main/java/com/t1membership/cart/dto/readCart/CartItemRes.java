// src/main/java/com/t1membership/cart/dto/readCart/CartItemRes.java
package com.t1membership.cart.dto.readCart;

import com.t1membership.cart.domain.CartEntity;
import com.t1membership.item.domain.ItemEntity;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
// com.t1membership.cart.dto.readCart.CartItemRes

@Builder
public class CartItemRes {

    private Long itemNo;
    private Long cartNo;
    private String itemName;
    private String thumbnail;

    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;

    private boolean membershipOnly;
    private boolean soldOut;

    private String optionLabel;  // 🔥 이미 있으니까 여기 그대로 사용

    public static CartItemRes from(CartEntity line) {
        ItemEntity item = line.getItem();
        BigDecimal unitPrice = item.getItemPrice();
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(line.getItemQuantity()));

        // 🔥 옵션 문구 만들기
        String label = line.getOptionLabel();   // DB에 이미 저장돼 있으면 이거 우선
        if (label == null || label.isBlank()) {
            String value = line.getOptionValue();   // S, M, FAKER ...
            if (value != null && !value.isBlank()) {
                label = value;
                // 만약 "SIZE / S" 처럼 kind 도 같이 보여주고 싶으면:
                 String kind = line.getOptionKind();
                 if (kind != null && !kind.isBlank()) {
                     label = kind + " / " + value;
                 } else {
                     label = value;
                 }
            } else {
                label = null; // 진짜 아무 정보도 없으면 null 유지
            }
        }

        return CartItemRes.builder()
                .itemNo(item.getItemNo())
                .cartNo(line.getCartNo())
                .itemName(item.getItemName())
                .thumbnail(/* resolveThumbnail(item) */ null) // 형님이 써둔 유틸 사용
                .quantity(line.getItemQuantity())
                .unitPrice(unitPrice)
                .lineTotal(lineTotal)
                .membershipOnly(/* itemCategory 보고 true/false */ false)
                .soldOut(item.getItemStock() <= 0)
                .optionLabel(line.getOptionLabel())   // 🔥 여기!
                .build();
    }
}
