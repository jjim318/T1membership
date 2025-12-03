package com.t1membership.board.dto.readOneBoard;

import com.t1membership.board.domain.BoardEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class ReadOneBoardRes {

    private Long boardNo;
    private String boardTitle;
    private String boardWriter;
    private String boardContent;
    private int boardLikeCount;
    private boolean notice;
    private boolean isSecret;

    private LocalDateTime createdDate;
    private LocalDateTime latestDate;

    // 🔥 컨텐츠 전용
    private String videoUrl;
    private String duration;

    public static ReadOneBoardRes from(BoardEntity boardEntity) {
        return ReadOneBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())
                .boardWriter(boardEntity.getMember().getMemberNickName())
                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .createdDate(boardEntity.getCreateDate())
                .latestDate(boardEntity.getLatestDate())
                // 🔥 신규 필드 매핑
                .videoUrl(boardEntity.getVideoUrl())
                .duration(boardEntity.getDuration())
                .build();
    }

}
