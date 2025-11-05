package com.t1membership.board.dto.createBoard;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateBoardRes {

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

    public static CreateBoardRes from(BoardEntity boardEntity) {
        return CreateBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())
                .boardWriter(boardEntity.getMember().getMemberNickName())
                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .createDate(boardEntity.getCreateDate())
                .latestDate(boardEntity.getLatestDate())
                .build();
    }

}
