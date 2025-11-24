package com.t1membership.board.dto.readComment;

import com.t1membership.coreDto.PageRequestDTO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true) // 부모(PageRequestDTO)의 필드까지 같이 출력
@NoArgsConstructor
@AllArgsConstructor
public class ReadCommentReq extends PageRequestDTO {

    // 어떤 게시글의 댓글을 조회할지
    private Long boardNo;

    // 정렬 기준 (기본값: commentNo)
    private String sortBy = "commentNo";
}
