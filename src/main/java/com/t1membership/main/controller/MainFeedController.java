package com.t1membership.main.controller;

import com.t1membership.ApiResult;
import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.main.dto.MainPageRes;
import com.t1membership.main.service.MainFeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/main")
@RequiredArgsConstructor
public class MainFeedController {

    private final MainFeedService mainFeedService;

    @GetMapping
    public ApiResult<MainPageRes> getMainPage() {
        MainPageRes res = mainFeedService.getMainPage();
        return new ApiResult<>(res);
    }
}
