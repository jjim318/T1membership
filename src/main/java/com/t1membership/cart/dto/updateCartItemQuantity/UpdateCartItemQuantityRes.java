package com.t1membership.cart.dto.updateCartItemQuantity;

import com.t1membership.item.dto.ItemDto;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateCartItemQuantityRes {

    private ItemDto item;

    private Long itemNo;

    private int itemQuantity;

}
