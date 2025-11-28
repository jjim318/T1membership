package com.t1membership.main.controller;

import com.t1membership.ApiResult;
import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.main.dto.MainFeedCardRes;
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

    @GetMapping("/feed")
    public ApiResult<PageResponseDTO<MainFeedCardRes>> readMainFeed(
            @RequestParam(defaultValue = "0") int page,   // 0부터 시작 (프론트도 0부터 보내는 상태)
            @RequestParam(defaultValue = "10") int size
    ) {
        // 1) PageRequestDTO 구성
        PageRequestDTO pageRequestDTO = new PageRequestDTO();
        pageRequestDTO.setPage(page);
        pageRequestDTO.setSize(size);

        // 2) 서비스 호출
        Page<MainFeedCardRes> feedPage = mainFeedService.readMainFeed(page, size);

        // 3) PageResponseDTO로 변환
        PageResponseDTO<MainFeedCardRes> responseDTO =
                PageResponseDTO.<MainFeedCardRes>withAll()
                        .pageRequestDTO(pageRequestDTO)
                        .dtoList(feedPage.getContent())
                        .total((int) feedPage.getTotalElements())
                        .build();

        // 4) ApiResult로 감싸서 반환
        return new ApiResult<>(responseDTO);
    }
}
