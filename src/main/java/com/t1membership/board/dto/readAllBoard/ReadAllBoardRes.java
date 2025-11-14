package com.t1membership.board.dto.readAllBoard;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardRes {

    private Long boardNo;
    private String boardTitle;
    private String boardWriter;
    private String boardContent;
    private int boardLikeCount;
    private BoardType boardType;
    private boolean notice;
    private boolean isSecret;


    public static ReadAllBoardRes from(BoardEntity boardEntity) {
        return ReadAllBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())
                .boardWriter(boardEntity.getMember().getMemberNickName())
                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .boardType(boardEntity.getBoardType())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .build();
    }

}
