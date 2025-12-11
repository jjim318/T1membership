package com.t1membership.item.dto.modifyItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder(toBuilder = true)
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ModifyItemReq {

    private Long itemNo;

    private String itemName;

    private BigDecimal itemPrice;

    private Integer itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;

}
