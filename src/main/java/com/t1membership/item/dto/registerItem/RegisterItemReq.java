package com.t1membership.item.dto.registerItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class RegisterItemReq {

    private String itemName;

    private Integer itemPrice;

    private Integer itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;

}
