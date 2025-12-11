package com.t1membership.main.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MainPageRes {
    private List<MainSectionItemDto> storyItems;    // STORY에서 가져온 것들
    private List<MainSectionItemDto> contentItems;  // CONTENT에서 가져온 것들
}
