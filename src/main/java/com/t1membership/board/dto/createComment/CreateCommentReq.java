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

    private Long bno;

    @NotBlank
    private String cContent;
    @Builder.Default
    private int cLikeCount = 0;

}
