package com.t1membership.board.controller;

import com.t1membership.ApiResult;
import com.t1membership.board.dto.story.CreateStoryReq;
import com.t1membership.board.dto.story.StoryDetailRes;
import com.t1membership.board.dto.story.StoryFeedRes;
import com.t1membership.board.service.BoardService;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;


@RestController
@RequiredArgsConstructor
@RequestMapping("/boards/story")
public class StoryController {
    private final BoardService boardService;
    private final MemberRepository memberRepository;

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
    // writer 없으면 전체, 있으면 해당 writer만
    // =========================
    @GetMapping("/feed")
    public ApiResult<Page<StoryFeedRes>> feed(
            @RequestParam(required = false) String writer,
            Pageable pageable
    ) {
        return new ApiResult<>(boardService.getStoryFeed(writer, pageable));
    }

    /// =========================
    // 스토리 상세
    // =========================
    @GetMapping("/{boardNo}")
    public ApiResult<StoryDetailRes> detail(@PathVariable Long boardNo) {
        return new ApiResult<>(boardService.getStoryDetail(boardNo));
    }
}
