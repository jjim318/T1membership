package com.t1membership.main.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MainSectionItemDto {
    private Long boardId;
    private String title;
    private String thumbnailUrl;   // 썸네일
    private String category;       // "STORY" / "CONTENT"
}
