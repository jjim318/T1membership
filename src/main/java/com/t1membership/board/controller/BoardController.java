package com.t1membership.board.controller;

import com.t1membership.ApiResult;
import com.t1membership.board.dto.createBoard.CreateBoardReq;
import com.t1membership.board.dto.createBoard.CreateBoardRes;
import com.t1membership.board.dto.deleteBoard.DeleteBoardReq;
import com.t1membership.board.dto.deleteBoard.DeleteBoardRes;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardReq;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardRes;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardReq;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardRes;
import com.t1membership.board.dto.updateBoard.UpdateBoardReq;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import com.t1membership.board.service.BoardService;
import com.t1membership.coreDto.PageResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @PostMapping
    public ApiResult<CreateBoardRes> createBoard(@RequestBody CreateBoardReq postReq) {
        var postRes = boardService.createBoard(postReq);
        return new ApiResult<>(postRes);
    }


    @PutMapping(value = "/{boardNo}")
    public ApiResult<UpdateBoardRes> updateBoard(@PathVariable Long boardNo, @RequestBody UpdateBoardReq putReq) {
        putReq = putReq.toBuilder().boardNo(boardNo).build();
        var putRes = boardService.updateBoard(putReq);
        return new ApiResult<>(putRes);
    }


    @DeleteMapping("/{boardNo}")
    public ApiResult<DeleteBoardRes> deleteBoard(@PathVariable Long boardNo) {
        DeleteBoardReq deleteReq = DeleteBoardReq.builder().boardNo(boardNo).build();
        var deleteRes = boardService.deleteBoard(deleteReq);
        return new ApiResult<>(deleteRes);
    }


    @GetMapping({"/{boardNo}", "/{boardNo}/edit"})
    public ApiResult<ReadOneBoardRes> readOneBoard(@PathVariable Long boardNo) {
        ReadOneBoardReq readReq = ReadOneBoardReq.builder().boardNo(boardNo).build();
        var readRes = boardService.readOneBoard(readReq);
        return new ApiResult<>(readRes);
    }


    @GetMapping
    public ApiResult<PageResponseDTO<ReadAllBoardRes>> readAllBoards(@ModelAttribute ReadAllBoardReq readReq) {
        var readAllRes = boardService.readAllBoard(readReq);
        return new ApiResult<>(readAllRes);
    }

}
