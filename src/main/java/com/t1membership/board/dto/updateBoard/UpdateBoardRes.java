package com.t1membership.board.dto.updateBoard;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBoardRes {

    private Long boardNo;
    private String boardTitle;
    private String boardWriter;
    private String boardContent;
    private int boardLikeCount;
    private BoardType boardType;
    private boolean notice;
    private boolean isSecret;

    private LocalDateTime createDate;
    private LocalDateTime latestDate;

    public static UpdateBoardRes from(BoardEntity boardEntity) {
        return UpdateBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())
                .boardWriter(boardEntity.getMember().getMemberNickName())
                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .boardType(boardEntity.getBoardType())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .createDate(boardEntity.getCreateDate())
                .latestDate(boardEntity.getLatestDate())
                .build();
    }

}
