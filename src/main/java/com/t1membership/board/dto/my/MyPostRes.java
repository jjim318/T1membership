package com.t1membership.board.dto.my;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyPostRes {
    private Long boardNo;
    private String category;      // categoryCode 같은 값 (about, lounge, to-t1 등)
    private String title;
    private LocalDateTime createdAt;
}
