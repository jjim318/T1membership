package com.t1membership.main.dto;

import com.t1membership.main.constant.FeedCardType;
import com.t1membership.main.constant.FeedOrigin;
import com.t1membership.main.constant.Mainsection;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MainFeedCardRes {
    // 공통
    private Long id;                   // 원본 엔티티 PK (내부 게시판/인스타 PK 등)
    private Mainsection section;       // STORY / CONTENT / COMMUNITY / SHOP / POP
    private FeedCardType type;         // LOCKED / NOTICE / POST / VIDEO / POP_NOTICE

    private String title;              // 카드 큰 제목
    private String subtitle;           // 작은 부제목 (옵션)
    private String thumbnailUrl;       // 썸네일 이미지 URL (옵션)
    private boolean membershipOnly;    // 멤버십 잠금 여부

    private LocalDateTime createdAt;   // 정렬 기준 (최신순)

    // 통계
    private long viewCount;
    private long commentCount;

    // 리액션(이모지별 카운트)
    private Map<String, Long> reactionCounts;

    // 프론트에서 이동할 링크
    private String linkUrl;

    // 어디서 온 글인지
    private FeedOrigin origin;         // INTERNAL / YOUTUBE / INSTAGRAM
    private String originAccount;      // "@SKTT1", "@t1lol" 등
}
