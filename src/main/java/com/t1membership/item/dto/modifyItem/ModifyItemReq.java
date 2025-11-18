package com.t1membership.item.dto.modifyItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

@Getter
@Setter
@Builder(toBuilder = true)
@ToString
public class ModifyItemReq {

    private Long itemNo;

    private String itemName;

    private BigDecimal itemPrice;

    private Integer itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;

}
