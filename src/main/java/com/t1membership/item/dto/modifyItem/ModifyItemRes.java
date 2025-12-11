package com.t1membership.item.dto.modifyItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class ModifyItemRes {

    private Long itemNo;

    private String itemName;

    private BigDecimal itemPrice;

    private Integer itemStock;

    private ItemCategory itemCategory;

    private ItemSellStatus itemSellStatus;


    public static ModifyItemRes from(ItemEntity item){
        return ModifyItemRes.builder()
                .itemNo(item.getItemNo())
                .itemName(item.getItemName())
                .itemPrice(item.getItemPrice())
                .itemStock(item.getItemStock())
                .itemCategory(item.getItemCategory())
                .itemSellStatus(item.getItemSellStatus())
                .build();
    }

}
