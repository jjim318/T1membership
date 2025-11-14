package com.t1membership.board.dto.deleteBoard;

import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeleteBoardRes {

    private Long boardNo;

    // ✅ 정적 팩토리 메서드 추가
    public static DeleteBoardRes success(Long boardNo) {
        return DeleteBoardRes.builder()
                .boardNo(boardNo)
                .build();
    }
}
