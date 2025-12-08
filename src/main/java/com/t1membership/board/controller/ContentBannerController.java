package com.t1membership.board.controller;

import com.t1membership.ApiResult;
import com.t1membership.board.dto.banner.BannerOrderReq;
import com.t1membership.board.dto.banner.ContentBannerRes;
import com.t1membership.board.service.ContentBannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ContentBannerController {

    private final ContentBannerService contentBannerService;

    // 메인에서 배너 가져가기
    @GetMapping("/main/banner")
    public ApiResult<List<ContentBannerRes>> readMainBanners() {
        var list = contentBannerService.readMainBanners();
        return new ApiResult<>(list);
    }

    // 관리자 배너 목록
    @GetMapping("/admin/banner")
    public ApiResult<List<ContentBannerRes>> readAdminBanners() {
        var list = contentBannerService.readAdminBanners();
        return new ApiResult<>(list);
    }

    // 관리자: 배너 설정 저장 (어떤 컨텐츠를 몇 번 순서로 쓸지)
    @PutMapping("/admin/banner/order")
    public ApiResult<Void> updateBannerOrder(
            @RequestBody List<BannerOrderReq> reqList
    ) {
        contentBannerService.updateBannerSettings(reqList);
        return new ApiResult<>(null);
    }
}

