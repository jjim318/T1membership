package com.t1membership.board.dto.my;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyCommentRes {
    private Long commentNo;
    private Long boardNo;
    private String category;      // 댓글 달린 글의 categoryCode (링크 만들 때 필요)
    private String boardTitle;    // 있으면 UX 좋아짐
    private String commentContent;
    private LocalDateTime createdAt;
}
