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

    // 🔥 옵션 정보 추가
    private String optionKind;   // "SIZE", "PLAYER", "QTY_ONLY" 등
    private String optionValue;  // "S", "FAKER" 같은 실제 값
    private String optionLabel;  // 프론트에 그대로 보여줄 라벨

}
