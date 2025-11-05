package com.t1membership.cart.dto.addCartItem;

import com.t1membership.item.dto.ItemDto;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AddCartItemRes {

    private ItemDto item;

}
