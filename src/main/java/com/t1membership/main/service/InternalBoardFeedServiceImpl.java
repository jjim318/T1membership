package com.t1membership.main.service;

import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.repository.BoardRepository;
import com.t1membership.main.constant.FeedCardType;
import com.t1membership.main.constant.FeedOrigin;
import com.t1membership.main.constant.Mainsection;
import com.t1membership.main.dto.MainFeedCardRes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InternalBoardFeedServiceImpl implements InternalBoardFeedService {

    private final BoardRepository boardRepository;

    @Override
    public List<MainFeedCardRes> fetchInternalFeed() {
        // 🔥 형님 상황에 맞게: 메인에 보일 게시글만 뽑는 쿼리로 변경해도 됨
        // 예) boardRepository.findTop20ByBoardTypeOrderByCreateDateDesc(...)
        List<BoardEntity> boards = boardRepository.findAll();

        return boards.stream()
                .map(board -> MainFeedCardRes.builder()
                        .id(board.getBoardNo())
                        .section(Mainsection.COMMUNITY)      // 필요하면 공지/자유 등으로 분기
                        .type(FeedCardType.POST)             // 공지면 NOTICE 로 변경 가능
                        .title(board.getBoardTitle())
                        .subtitle(board.getBoardContent())
                        .thumbnailUrl(null)                  // 나중에 이미지 붙이면 여기
                        .membershipOnly(false)               // 멤버십 전용 게시판이면 true
                        .createdAt(board.getCreateDate())
                        .viewCount(0L)
                        .commentCount(0L)
                        .reactionCounts(null)                // 좋아요 수 등 넣어도 됨
                        .linkUrl("/community/" + board.getBoardNo()) // 프론트 라우팅에 맞게
                        .origin(FeedOrigin.INTERNAL)
                        .originAccount("T1membership")
                        .build())
                .toList();
    }
}
