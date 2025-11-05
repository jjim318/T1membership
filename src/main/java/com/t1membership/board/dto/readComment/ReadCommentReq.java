package com.t1membership.board.dto.readComment;

import com.t1membership.coreDto.PageRequestDTO;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@Builder
@ToString
public class ReadCommentReq extends PageRequestDTO {

    private Long boardNo;

    private String sortBy = "commentNo";

}
