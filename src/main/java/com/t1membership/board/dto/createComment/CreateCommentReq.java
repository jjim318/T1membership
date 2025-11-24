package com.t1membership.board.dto.createComment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateCommentReq {

    private Long boardNo;

    @NotBlank
    private String commentContent;

    @Builder.Default
    private int commentLikeCount = 0;

}
