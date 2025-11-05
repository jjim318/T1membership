package com.t1membership.cart.dto.addCartItem;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AddCartItemReq {

    private Long ItemNo;

    @Min(1)
    private int Quantity;
}
