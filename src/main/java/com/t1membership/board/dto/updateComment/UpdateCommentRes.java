package com.t1membership.board.dto.updateComment;

// package com.t1membership.board.dto.updateComment;

import com.t1membership.board.domain.CommentEntity;
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

    private String memberProfileImageUrl;

    private String commentContent;
    private int commentLikeCount;

    private String createdAt;

    public static UpdateCommentRes from(CommentEntity e) {
        return UpdateCommentRes.builder()
                .commentNo(e.getCommentNo())
                .commentWriter(e.getMember().getMemberNickName())
                .memberProfileImageUrl(e.getMember().getMemberImage()) // ✅ MemberEntity 필드명 맞추기
                .commentContent(e.getCommentContent())
                .commentLikeCount(e.getCommentLikeCount())
                .createdAt(e.getCreateDate() != null ? e.getCreateDate().toString() : null) // ✅ BaseEntity 필드명 맞추기
                .build();
    }
}

