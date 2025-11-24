package com.t1membership.board.dto.readComment;

import lombok.Builder;

@Builder
public class ReadCommentRes {

    private Long commentNo;
    private Long boardNo;
    private String commentWriter;
    private String commentContent;
    private int commentLikeCount;

}
