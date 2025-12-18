package com.t1membership.board.dto.story;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ToggleStoryLikeRes {
    private Long boardNo;
    private boolean liked;     // 토글 후 상태 (true=좋아요됨)
    private int likeCount;     // 토글 후 좋아요 수
}
