package com.t1membership.board.dto.createComment;

// package com.t1membership.board.dto.createComment;

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
    private Long boardNo;
    private String commentWriter;

    private String memberProfileImageUrl;

    private String commentContent;
    private int commentLikeCount;

    private String createdAt;

    public static CreateCommentRes from(CommentEntity e) {
        return CreateCommentRes.builder()
                .commentNo(e.getCommentNo())
                .boardNo(e.getBoard().getBoardNo())
                .commentWriter(e.getMember().getMemberNickName())
                .memberProfileImageUrl(e.getMember().getMemberImage()) // ✅ 여긴 형님 MemberEntity 필드명에 맞추세요
                .commentContent(e.getCommentContent())
                .commentLikeCount(e.getCommentLikeCount())
                .createdAt(e.getCreateDate() != null ? e.getCreateDate().toString() : null) // ✅ BaseEntity 필드명에 맞추세요
                .build();
    }
}

