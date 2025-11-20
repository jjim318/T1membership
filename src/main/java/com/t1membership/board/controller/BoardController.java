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
import com.t1membership.image.dto.ExistingImageDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    // ====== 게시글 등록 (텍스트 + 새 이미지들) ======
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<CreateBoardRes> createBoard(
            @ModelAttribute CreateBoardReq postReq,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) {
        var postRes = boardService.createBoard(postReq, images);
        return new ApiResult<>(postRes);
    }

    // ====== 게시글 수정 (텍스트 + 기존 이미지 정보 + 새 이미지들) ======
    @PutMapping(value = "/{boardNo}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<UpdateBoardRes> updateBoard(
            @PathVariable Long boardNo,
            @ModelAttribute UpdateBoardReq putReq,
            @RequestPart(value = "existingImages", required = false) List<ExistingImageDTO> existingImages,
            @RequestPart(value = "images", required = false) List<MultipartFile> newImages
    ) {
        putReq = putReq.toBuilder()
                .boardNo(boardNo)
                .build();

        var putRes = boardService.updateBoard(putReq, existingImages, newImages);
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
