package com.t1membership.board.dto.updateBoard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.t1membership.board.constant.BoardType;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateBoardReq {

    private Long boardNo;
    private String boardTitle;
    private String boardContent;
    private BoardType boardType;
    private boolean notice;
    private boolean isSecret;
}
