package com.t1membership.board.dto.content;

import com.t1membership.board.domain.BoardEntity;
import com.t1membership.image.domain.ImageEntity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentSummaryRes {

    private Long boardNo;
    private String boardTitle;
    private String categoryCode;   // ONWORLD_T1, NOTICE, ...
    private String thumbnailUrl;   // 첫 번째 이미지 기준
    private String duration;       // 🔥 이제 실제 값 채울 것
    private LocalDateTime createdAt;

    public static ContentSummaryRes from(BoardEntity board) {
        String thumb = null;

        List<ImageEntity> images = board.getImages();
        if (images != null && !images.isEmpty()) {
            ImageEntity img = images.get(0); // sortOrder ASC 기준 첫 번째
            if (img.getUrl() != null) {
                thumb = img.getUrl();        // FileService 에서 url 세팅해주는 경우
            } else if (img.getFileName() != null) {
                // 형님 프로젝트 업로드 경로 규칙에 맞춰서 수정
                thumb = "/upload/" + img.getFileName();
            }
        }

        return ContentSummaryRes.builder()
                .boardNo(board.getBoardNo())
                .boardTitle(board.getBoardTitle())
                .categoryCode(board.getCategoryCode())
                .thumbnailUrl(thumb)
                // 🔥 BoardEntity.duration 사용
                .duration(board.getDuration())
                .createdAt(board.getCreateDate()) // BaseEntity 에 맞게
                .build();
    }
}
