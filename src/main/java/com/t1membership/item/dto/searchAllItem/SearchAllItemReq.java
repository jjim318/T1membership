package com.t1membership.item.dto.searchAllItem;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.Player;
import com.t1membership.item.constant.PopPlanType;
import lombok.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchAllItemReq {

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 10;

    @Builder.Default
    private String sortBy = "itemNo";

    @Builder.Default
    private String direction = "DESC";

    @Builder.Default
    private ItemCategory itemCategory = ItemCategory.ALL; // 🔥 기본값

    private Player popPlayer;

    private PopPlanType popPlanType;


    public Pageable toPageable() {
        Sort sort = direction.equalsIgnoreCase("ASC") ?
                Sort.by(sortBy).ascending() :
                Sort.by(sortBy).descending();
        return PageRequest.of(page, size, sort);
    }
}

