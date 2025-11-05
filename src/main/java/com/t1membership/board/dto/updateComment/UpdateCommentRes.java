package com.t1membership.board.dto.updateComment;

import com.t1membership.board.domain.CommentEntity;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateCommentRes {

    private Long commentNo;
    private String commentWriter;
    private String commentContent;
    private int commentLikeCount;

    public static UpdateCommentRes from(CommentEntity commentEntity) {
        return UpdateCommentRes.builder()
                .commentNo(commentEntity.getCommentNo())
                .commentWriter(commentEntity.getMember().getMemberNickName())
                .commentContent(commentEntity.getCommentContent())
                .commentLikeCount(commentEntity.getCommentLikeCount())
                .build();
    }
}
