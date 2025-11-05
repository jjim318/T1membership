package com.t1membership.board.dto.readOneBoard;

import com.t1membership.board.constant.BoardType;
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
}
