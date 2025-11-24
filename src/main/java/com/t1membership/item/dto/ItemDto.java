package com.t1membership.item.dto;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

@Getter
@Setter
@ToString
@NoArgsConstructor
public class ItemDto {

    private Long itemNo;

    private String itemName;

    private BigDecimal itemPrice;

    private int itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;

}
