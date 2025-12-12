package com.t1membership.board.dto.readComment;

// package com.t1membership.board.dto.readComment;

import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadCommentRes {

    private Long commentNo;
    private Long boardNo;

    // 작성자 닉네임
    private String commentWriter;

    // 작성자 프로필 이미지 (MemberEntity.memberImage 같은 값)
    private String memberProfileImageUrl;

    private String commentContent;
    private int commentLikeCount;

    // 생성일시 (BaseEntity createdDate를 내려줄 생각)
    private String createdAt;
}
