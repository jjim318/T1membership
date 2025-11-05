package com.t1membership.board.dto.createBoard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.t1membership.board.constant.BoardType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateBoardReq {

    @NotBlank
    private String boardTitle;
    @NotBlank
    private String boardContent;
    @Builder.Default
    private int boardLikeCount = 0;

    private BoardType boardType;
    private boolean notice;
    private boolean isSecret;

}
