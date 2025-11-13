package com.t1membership.cart.dto.prepareOrder;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class PrepareOrderReq {
    @NotEmpty(message = "선택된 상품이 없습니다.")
    private List<Long> itemNos; // 프론트 체크박스에서 선택된 itemNo 리스트
}
