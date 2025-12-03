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
    private Boolean notice;
    private Boolean isSecret;
    private String categoryCode;

    // 🔥 컨텐츠 전용 필드 (일반 게시판에서는 null 허용)
    private String videoUrl;   // 유튜브 URL 등
    private String duration;   // "12:34" 같은 형식

}
