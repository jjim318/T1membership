package com.t1membership.board.dto.readAllBoard;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardReq {

    private int page;
    private int size;
    private String boardType;

    private String sortBy;

}
