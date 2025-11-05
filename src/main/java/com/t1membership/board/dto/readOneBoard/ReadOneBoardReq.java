package com.t1membership.board.dto.readOneBoard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

@Getter
@Service
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadOneBoardReq {

    private Long boardNo;
}
