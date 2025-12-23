package com.t1membership.board.controller;

import com.t1membership.ApiResult;
import com.t1membership.board.dto.createComment.CreateCommentReq;
import com.t1membership.board.dto.createComment.CreateCommentRes;
import com.t1membership.board.dto.deleteComment.DeleteCommentReq;
import com.t1membership.board.dto.deleteComment.DeleteCommentRes;
import com.t1membership.board.dto.my.MyCommentRes;
import com.t1membership.board.dto.readComment.ReadCommentReq;
import com.t1membership.board.dto.readComment.ReadCommentRes;
import com.t1membership.board.dto.updateComment.UpdateCommentReq;
import com.t1membership.board.dto.updateComment.UpdateCommentRes;
import com.t1membership.board.service.CommentService;
import com.t1membership.config.SecurityUtil;
import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/comment")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 댓글 등록
    @PostMapping
    public ApiResult<CreateCommentRes> createComment(@RequestBody CreateCommentReq postReq) {
        var postRes = commentService.createComment(postReq);
        return new ApiResult<>(postRes);
    }

    // 댓글 수정
    @PutMapping("/{commentNo}")
    public ApiResult<UpdateCommentRes> updateComment(@PathVariable Long commentNo,
                                                     @RequestBody UpdateCommentReq putReq) {

        // UpdateCommentReq 에 @Builder(toBuilder = true) 있어야 함
        putReq = putReq.toBuilder()
                .commentNo(commentNo)
                .build();

        var putRes = commentService.updateComment(putReq);
        return new ApiResult<>(putRes);
    }

    // 댓글 삭제
    @DeleteMapping("/{commentNo}")
    public ApiResult<DeleteCommentRes> deleteComment(@PathVariable Long commentNo) {
        DeleteCommentReq deleteReq = DeleteCommentReq.builder()
                .commentNo(commentNo)
                .build();

        var deleteRes = commentService.deleteComment(deleteReq);
        return new ApiResult<>(deleteRes);
    }

    // 댓글 목록 조회 (게시글별 + 페이징)
    // 예: GET /comment?boardNo=1&page=0&size=10&sortBy=commentNo
    @GetMapping
    public ApiResult<PageResponseDTO<ReadCommentRes>> readComments(@ModelAttribute ReadCommentReq readReq) {
        var readAllRes = commentService.readComments(readReq);
        return new ApiResult<>(readAllRes);
    }

    @GetMapping("/my")
    public ApiResult<PageResponseDTO<MyCommentRes>> readMyComments(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String email = SecurityUtil.getCurrentMemberEmail();
        PageRequestDTO pageRequestDTO = PageRequestDTO.builder()
                .page(page)
                .size(size)
                .build();

        PageResponseDTO<MyCommentRes> result = commentService.readMyComments(email, pageRequestDTO);
        return new ApiResult<>(result);
    }


}
