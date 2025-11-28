package com.t1membership.main.service;

import com.t1membership.board.repository.BoardRepository;
import com.t1membership.item.repository.ItemRepository;
import com.t1membership.main.constant.FeedCardType;
import com.t1membership.main.constant.FeedOrigin;
import com.t1membership.main.constant.Mainsection;
import com.t1membership.main.domain.ExternalSocialPost;
import com.t1membership.main.dto.MainFeedCardRes;
import com.t1membership.main.repository.ExternalSocialPostRepository;
import com.t1membership.main.youtube.dto.YoutubeClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MainFeedServiceImpl implements MainFeedService {

    private final YoutubeClient youtubeClient;
    private final ExternalSocialPostRepository externalSocialPostRepository;
    private final InternalBoardFeedService internalBoardFeedService;

    @Override
    public Page<MainFeedCardRes> readMainFeed(int page, int size) {

        // 1) 내부 게시판 글
        List<MainFeedCardRes> internal = internalBoardFeedService.fetchInternalFeed();

        // 2) 유튜브 최신 영상 (20개 정도)
        List<MainFeedCardRes> youtube = youtubeClient.fetchLatestVideos(20);

        // 3) 인스타(지금은 DB 기반 수동 등록)
        List<MainFeedCardRes> instagram = externalSocialPostRepository
                .findTop30ByPlatformOrderByCreateDateDesc("INSTAGRAM")
                .stream()
                .map(this::mapInstagramToFeed)
                .toList();

        // 4) 전체 합치고 createdAt 기준 내림차순 정렬
        List<MainFeedCardRes> merged = Stream.of(internal, youtube, instagram)
                .flatMap(Collection::stream)
                .sorted(Comparator.comparing(MainFeedCardRes::getCreatedAt).reversed())
                .toList();

        int from = Math.max(0, page * size);
        int to = Math.min(from + size, merged.size());

        List<MainFeedCardRes> content =
                (from >= merged.size()) ? List.of() : merged.subList(from, to);

        return new PageImpl<>(
                content,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")),
                merged.size()
        );
    }

    private MainFeedCardRes mapInstagramToFeed(ExternalSocialPost post) {
        return MainFeedCardRes.builder()
                .id(post.getId())
                .section(Mainsection.CONTENT)
                .type(FeedCardType.POST)
                .title(post.getTitle())
                .subtitle(post.getSubtitle())
                .thumbnailUrl(post.getThumbnailUrl())
                .membershipOnly(false)
                .createdAt(post.getCreateDate())
                .viewCount(0L)
                .commentCount(0L)
                .reactionCounts(null)
                .linkUrl(post.getPostUrl())
                .origin(FeedOrigin.INSTAGRAM)
                .originAccount(post.getAccount()) // @t1lol, @choi_doran 등
                .build();
    }
}
