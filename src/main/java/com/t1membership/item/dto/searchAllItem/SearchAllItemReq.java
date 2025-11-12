package com.t1membership.item.dto.searchAllItem;

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

    private int page = 0;             // 현재 페이지 (0부터 시작)
    private int size = 10;            // 한 페이지당 아이템 수
    private String sortBy = "itemNo"; // 정렬 기준 컬럼
    private String direction = "DESC"; // ASC or DESC

    // Pageable 변환 메서드
    public Pageable toPageable() {
        Sort sort = direction.equalsIgnoreCase("ASC") ?
                Sort.by(sortBy).ascending() :
                Sort.by(sortBy).descending();
        return PageRequest.of(page, size, sort);
    }
}
