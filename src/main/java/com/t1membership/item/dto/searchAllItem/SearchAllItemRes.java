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

    // ★ 썸네일 URL 추가
    private String thumbnailUrl;

    public static SearchAllItemRes from(ItemEntity entity) {

        // ★ 첫 번째 이미지의 imageUrl을 썸네일로 사용
        String thumbnailUrl = null;
        if (entity.getImages() != null && !entity.getImages().isEmpty()) {
            // ImageEntity 필드명이 imageUrl 이라고 가정 (컬럼: image_url)
            thumbnailUrl = entity.getImages().get(0).getUrl();
        }

        return SearchAllItemRes.builder()
                .itemNo(entity.getItemNo())
                .itemName(entity.getItemName())
                .itemPrice(entity.getItemPrice())
                .itemStock(entity.getItemStock())
                .itemCategory(entity.getItemCategory())
                .itemSellStatus(entity.getItemSellStatus())
                .thumbnailUrl(thumbnailUrl)
                .build();
    }
}
