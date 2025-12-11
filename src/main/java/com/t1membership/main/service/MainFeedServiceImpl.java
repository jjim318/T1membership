package com.t1membership.main.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.repository.BoardRepository;
import com.t1membership.main.dto.MainPageRes;
import com.t1membership.main.dto.MainSectionItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MainFeedServiceImpl implements MainFeedService {

    private final BoardRepository boardRepository;

    @Override
    public MainPageRes getMainPage() {

        // 1) STORY 최신 6개
        List<MainSectionItemDto> storyItems =
                boardRepository.findTop6ByBoardTypeOrderByCreateDateDesc(BoardType.STORY)
                        .stream()
                        .map(b -> MainSectionItemDto.builder()
                                .boardId(b.getBoardNo())
                                .title(b.getBoardTitle())
                                .thumbnailUrl(b.getVideoUrl()) // 엔티티에 맞게
                                .category(b.getBoardType().name())
                                .build())
                        .toList();

        // 2) CONTENT 최신 6개
        List<MainSectionItemDto> contentItems =
                boardRepository.findTop6ByBoardTypeOrderByCreateDateDesc(BoardType.CONTENT)
                        .stream()
                        .map(b -> MainSectionItemDto.builder()
                                .boardId(b.getBoardNo())
                                .title(b.getBoardTitle())
                                .thumbnailUrl(b.getVideoUrl())
                                .category(b.getBoardType().name())
                                .build())
                        .toList();

        // 3) 한 번에 래핑해서 리턴
        return MainPageRes.builder()
                .storyItems(storyItems)
                .contentItems(contentItems)
                .build();
    }
}
