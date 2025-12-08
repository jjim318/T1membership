package com.t1membership.board.dto.banner;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BannerOrderReq {
    private Long boardNo;      // boardNo
    private int sortOrder;     // 1,2,3...
}

