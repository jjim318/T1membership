package com.t1membership.board.dto.readComment;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    // 작성자 프로필 이미지
    private String memberProfileImageUrl;

    private String commentContent;
    private int commentLikeCount;

    // 생성일시
    private String createdAt;

    // ✅ 핵심: JSON 필드명을 "isMine"으로 고정
    @JsonProperty("isMine")
    private boolean mine;
}
