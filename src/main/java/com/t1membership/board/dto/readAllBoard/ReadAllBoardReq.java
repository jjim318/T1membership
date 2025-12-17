package com.t1membership.board.dto.readAllBoard;

import com.t1membership.board.constant.BoardType;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardReq {

    private int page = 0;
    private int size = 10;
    private String sortBy = "boardNo";

    // com.t1membership.board.dto.readAllBoard.ReadAllBoardReq
    private BoardType boardType;
    private String categoryCode;

    // To.T1 "내 글만"용
    private Boolean mineOnly;

}
