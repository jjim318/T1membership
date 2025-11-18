package com.t1membership.item.dto.searchOneItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.domain.ItemEntity;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchOneItemRes {

    private Long itemNo;

    private String itemName;

    private BigDecimal itemPrice;

    private int itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;


    public static SearchOneItemRes from(ItemEntity item) {
        return SearchOneItemRes.builder()
                .itemNo(item.getItemNo())
                .itemName(item.getItemName())
                .itemPrice(item.getItemPrice())
                .itemStock(item.getItemStock())
                .itemCategory(item.getItemCategory())
                .itemSellStatus(item.getItemSellStatus())
                .build();
    }

}
