package com.t1membership.item.dto.registerItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.domain.ItemEntity;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class RegisterItemRes {

    private String itemName;

    private int itemPrice;

    private int itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;


    public static RegisterItemRes from(ItemEntity item){
        return RegisterItemRes.builder()
                .itemName(item.getItemName())
                .itemPrice(item.getItemPrice())
                .itemStock(item.getItemStock())
                .itemCategory(item.getItemCategory())
                .itemSellStatus(item.getItemSellStatus())
                .build();
    }

}
