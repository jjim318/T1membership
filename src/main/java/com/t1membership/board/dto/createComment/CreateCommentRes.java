package com.t1membership.board.dto.createComment;

import com.t1membership.board.domain.CommentEntity;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateCommentRes {

    private Long commentNo;
    private String commentWriter;
    private String commentContent;
    private int commentLikeCount;

    public static CreateCommentRes from(CommentEntity commentEntity) {
        return CreateCommentRes.builder()
                .commentNo(commentEntity.getCommentNo())
                .commentWriter(commentEntity.getMember().getMemberNickName())
                .commentContent(commentEntity.getCommentContent())
                .commentLikeCount(commentEntity.getCommentLikeCount())
                .build();
    }
}
