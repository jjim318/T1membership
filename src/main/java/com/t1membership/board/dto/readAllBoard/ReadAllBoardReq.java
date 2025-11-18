package com.t1membership.board.dto.readAllBoard;

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

    private String boardType;

}
