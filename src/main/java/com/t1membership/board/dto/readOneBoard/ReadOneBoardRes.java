package com.t1membership.board.dto.readOneBoard;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.dto.createBoard.CreateBoardRes;
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
                .build();
    }

}
