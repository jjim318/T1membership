package com.t1membership.main.service;

import com.t1membership.main.dto.MainFeedCardRes;

import java.util.List;

public interface InternalBoardFeedService {
    /**
     * 공지, 커뮤니티 등 내부 게시판에서 메인에 보여줄 카드 리스트 모으기
     */
    List<MainFeedCardRes> fetchInternalFeed();
}
