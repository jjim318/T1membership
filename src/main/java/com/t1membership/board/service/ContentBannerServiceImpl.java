package com.t1membership.board.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.dto.banner.BannerOrderReq;
import com.t1membership.board.dto.banner.ContentBannerRes;
import com.t1membership.board.repository.BoardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ContentBannerServiceImpl implements ContentBannerService {

    private final BoardRepository boardRepository;

    @Transactional(readOnly = true)
    public List<ContentBannerRes> readMainBanners() {
        return boardRepository
                .findByBoardTypeAndMainBannerIsTrueOrderByBannerOrderAscBoardNoDesc(BoardType.CONTENT)
                .stream()
                .map(ContentBannerRes::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContentBannerRes> readAdminBanners() {
        return readMainBanners(); // 관리자도 우선 “지금 배너로 쓰는 것들”만 본다고 가정
    }

    // 관리자에서 “배너로 쓸 컨텐츠 + 순서” 저장
    public void updateBannerSettings(List<BannerOrderReq> reqList) {

        // 1) 기존 배너 플래그 전부 초기화
        var current = boardRepository
                .findByBoardTypeAndMainBannerIsTrueOrderByBannerOrderAscBoardNoDesc(BoardType.CONTENT);
        for (BoardEntity e : current) {
            e.changeBanner(false, null);
        }

        // 2) 들어온 리스트대로 다시 설정
        for (BannerOrderReq req : reqList) {
            BoardEntity e = boardRepository.findById(req.getBoardNo())
                    .orElseThrow(() -> new IllegalArgumentException("게시글이 없습니다. id=" + req.getBoardNo()));
            e.changeBanner(true, req.getSortOrder());
        }
    }

}
