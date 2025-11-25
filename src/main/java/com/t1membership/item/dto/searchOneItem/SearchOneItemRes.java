package com.t1membership.item.dto.searchOneItem;

import com.t1membership.image.dto.ExistingImageDTO;
import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.domain.ItemEntity;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

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

    // ★ 상세페이지에서 쓸 이미지들
    private List<ExistingImageDTO> images;


    public static SearchOneItemRes from(ItemEntity item) {

        List<ExistingImageDTO> images = item.getImages().stream()
                .map(ExistingImageDTO::from)
                .toList();

        return SearchOneItemRes.builder()
                .itemNo(item.getItemNo())
                .itemName(item.getItemName())
                .itemPrice(item.getItemPrice())
                .itemStock(item.getItemStock())
                .itemCategory(item.getItemCategory())
                .itemSellStatus(item.getItemSellStatus())
                .images(images)
                .build();
    }

}
