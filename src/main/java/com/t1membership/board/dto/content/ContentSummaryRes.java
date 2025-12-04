package com.t1membership.board.dto.content;

import com.t1membership.board.domain.BoardEntity;
import com.t1membership.image.domain.ImageEntity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

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
    private String duration;       // t1_board.duration
    private LocalDateTime createdAt;

    public static ContentSummaryRes from(BoardEntity board) {

        // 🔥 썸네일: image_order(또는 sortOrder) 가장 낮은 거 1장
        String thumb = null;

        List<ImageEntity> images = board.getImages();
        if (images != null && !images.isEmpty()) {
            thumb = images.stream()
                    // image_order 컬럼 이름에 맞춰서 메서드 변경 필요:
                    // getSortOrder / getImageOrder 중 프로젝트에 맞는 걸 쓰세요.
                    .sorted(Comparator.comparing(ImageEntity::getSortOrder))
                    .map(img -> {
                        // ① url 컬럼이 이미 "/files/uuid.png" 형태면 그대로 사용
                        if (img.getUrl() != null && !img.getUrl().isBlank()) {
                            return img.getUrl();
                        }
                        // ② url이 비어 있고 fileName만 있으면, 형님 프로젝트 규칙에 맞춰 접두사 붙이기
                        if (img.getFileName() != null && !img.getFileName().isBlank()) {
                            // FileController 가 "/files/{fileName}" 같은지 "/upload" 같은지에 맞춰 수정
                            return "/files/" + img.getFileName();
                        }
                        return null;
                    })
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        }

        return ContentSummaryRes.builder()
                .boardNo(board.getBoardNo())
                .boardTitle(board.getBoardTitle())
                .categoryCode(board.getCategoryCode())
                .thumbnailUrl(thumb)
                // 🔥 재생시간: t1_board.duration 그대로
                .duration(board.getDuration())
                // 🔥 등록일: BaseEntity.createDate
                .createdAt(board.getCreateDate())
                .build();
    }
}
