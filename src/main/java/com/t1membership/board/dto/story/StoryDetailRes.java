package com.t1membership.board.dto.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StoryDetailRes {

    private Long boardNo;
    private String writer;
    private String title;
    private String content;
    private boolean locked;

    private int likeCount;

    // ✅ 내가 좋아요 눌렀는지 (초기 버튼 상태용)
    private boolean likedByMe;

    // ✅ 상세용 전체 이미지
    private List<String> imageUrls;
    private LocalDateTime createdDate;
}
