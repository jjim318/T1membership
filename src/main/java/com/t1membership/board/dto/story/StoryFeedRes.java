package com.t1membership.board.dto.story;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Getter
@Service
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StoryFeedRes {
    private Long boardNo;
    private String writer;          // T1 / faker / doran ...
    private String title;
    private String contentPreview;
    private boolean locked;
    private int likeCount;

    // ✅ 피드용 대표 이미지 1장 (없으면 null)
    private String thumbnailUrl;

    private LocalDateTime createdDate;
}
