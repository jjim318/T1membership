package com.t1membership.board.controller;

import com.t1membership.ApiResult;
import com.t1membership.board.dto.story.CreateStoryReq;
import com.t1membership.board.dto.story.StoryDetailRes;
import com.t1membership.board.dto.story.StoryFeedRes;
import com.t1membership.board.service.BoardService;
import com.t1membership.board.service.StoryLikeService;
import com.t1membership.board.dto.story.ToggleStoryLikeRes;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/boards/story")
public class StoryController {

    private final BoardService boardService;

    // ✅ 추가: 좋아요 서비스
    private final StoryLikeService storyLikeService;

    // =========================
    // 스토리 작성
    // =========================
    @PostMapping
    public ApiResult<Void> createStory(
            @AuthenticationPrincipal String email,
            @RequestBody @Valid CreateStoryReq req
    ) {
        boardService.createStory(email, req);
        return new ApiResult<>(null);
    }

    // =========================
    // 스토리 피드
    // =========================
    @GetMapping("/feed")
    public ApiResult<Page<StoryFeedRes>> feed(
            @RequestParam(required = false) String writer,
            Pageable pageable
    ) {
        return new ApiResult<>(boardService.getStoryFeed(writer, pageable));
    }

    // =========================
    // 스토리 상세
    // =========================
    @GetMapping("/{boardNo}")
    public ApiResult<StoryDetailRes> detail(@PathVariable Long boardNo) {
        return new ApiResult<>(boardService.getStoryDetail(boardNo));
    }

    // =========================
    // ✅ 스토리 좋아요 토글
    // - 로그인만 하면 됨 (멤버십 잠금이어도 가능)
    // =========================
    // StoryController 안
    @PostMapping("/{boardNo}/like")
    public ApiResult<ToggleStoryLikeRes> toggleLike(
            @AuthenticationPrincipal String email,
            @PathVariable Long boardNo
    ) {
        // ✅ 순서: (boardNo, email)
        return new ApiResult<>(storyLikeService.toggleLike(boardNo, email));
    }

}
