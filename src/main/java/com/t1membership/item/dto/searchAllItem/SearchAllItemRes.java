package com.t1membership.item.dto.searchAllItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.domain.ItemEntity;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchAllItemRes {

    private Long itemNo;
    private String itemName;
    private BigDecimal itemPrice;
    private int itemStock;
    private ItemCategory itemCategory;
    private ItemSellStatus itemSellStatus;

    public static SearchAllItemRes from(ItemEntity entity) {
        return SearchAllItemRes.builder()
                .itemNo(entity.getItemNo())
                .itemName(entity.getItemName())
                .itemPrice(entity.getItemPrice())
                .itemStock(entity.getItemStock())
                .itemCategory(entity.getItemCategory())
                .itemSellStatus(entity.getItemSellStatus())
                .build();
    }
}
