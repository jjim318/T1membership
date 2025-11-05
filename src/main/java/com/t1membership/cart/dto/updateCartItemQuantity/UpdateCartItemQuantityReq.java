package com.t1membership.cart.dto.updateCartItemQuantity;

import jakarta.validation.constraints.Min;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateCartItemQuantityReq {

    @Min(1)
    private int Quantity;

}
