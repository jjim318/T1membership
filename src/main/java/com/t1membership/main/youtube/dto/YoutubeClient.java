package com.t1membership.main.youtube.dto;

import com.t1membership.main.constant.FeedCardType;
import com.t1membership.main.constant.FeedOrigin;
import com.t1membership.main.constant.Mainsection;
import com.t1membership.main.dto.MainFeedCardRes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * T1 YouTube 채널에서 최신 영상 가져와서 MainFeedCardRes 로 변환하는 클라이언트
 */
@Slf4j
@Component
public class YoutubeClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${youtube.api-key}")
    private String apiKey;

    @Value("${youtube.channel-id}")
    private String channelId; // @SKTT1 채널 ID

    @Value("${youtube.default-account:@SKTT1}")
    private String defaultAccount;

    /**
     * 로컬/테스트에서 유튜브 아예 안 치고 싶을 때 false 로 꺼버리기
     */
    @Value("${youtube.enabled:true}")
    private boolean enabled;

    /**
     * 캐시 유효 시간(분). 이 시간 동안은 DB/캐시 값만 쓰고 유튜브 안 두드림.
     */
    @Value("${youtube.cache-minutes:10}")
    private long cacheMinutes;

    // ===== 캐시 및 쿼터 쿨다운 상태 =====

    /** 마지막으로 성공/실패 상관없이 유튜브 API를 호출한 시간 */
    private volatile LocalDateTime lastFetchTime = null;

    /** 마지막으로 성공한 결과 캐시 (없으면 빈 리스트) */
    private volatile List<MainFeedCardRes> cache = Collections.emptyList();

    /**
     * 쿼터 초과(quotaExceeded) 발생 후, 이 시각까지는 유튜브 API를 다시 호출하지 않도록 막는 시간.
     * null 이면 쿼터 정상 상태.
     */
    private volatile LocalDateTime quotaSleepUntil = null;

    /**
     * T1 YouTube 채널 최신 영상 N개 조회 → MainFeedCardRes 리스트로 변환
     *
     * @param limit 가져올 영상 개수
     */
    public List<MainFeedCardRes> fetchLatestVideos(int limit) {

        LocalDateTime now = LocalDateTime.now();

        // 0. 아예 기능 비활성화 (로컬 개발용)
        if (!enabled) {
            log.info("[YoutubeClient] youtube.enabled=false, 유튜브 호출 없이 빈 리스트 반환");
            return Collections.emptyList();
        }

        // 1. 쿼터 초과로 인해 쿨다운 중이면 외부 호출 금지
        if (quotaSleepUntil != null && now.isBefore(quotaSleepUntil)) {
            log.warn("[YoutubeClient] quotaExceeded 이후 쿨다운 중 ({} 까지). 외부 호출 막고 캐시/빈 리스트 반환",
                    quotaSleepUntil);
            return (cache != null && !cache.isEmpty()) ? cache : Collections.emptyList();
        }

        // 2. 캐시 유효 시간 안이면 캐시 사용
        if (lastFetchTime != null) {
            LocalDateTime threshold = now.minusMinutes(cacheMinutes);
            if (lastFetchTime.isAfter(threshold)) {
                log.debug("[YoutubeClient] 캐시 사용 (lastFetchTime={})", lastFetchTime);
                return cache != null ? cache : Collections.emptyList();
            }
        }

        // 3. 실제 YouTube Data API 호출
        String url = UriComponentsBuilder
                .fromUriString("https://www.googleapis.com/youtube/v3/search")
                .queryParam("part", "snippet")
                .queryParam("channelId", channelId)
                .queryParam("order", "date")
                .queryParam("type", "video")
                .queryParam("maxResults", limit)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YoutubeSearchRes response =
                    restTemplate.getForObject(url, YoutubeSearchRes.class);

            if (response == null || response.getItems() == null) {
                log.warn("[YoutubeClient] 응답이 비어있음, 빈 리스트 반환");
                lastFetchTime = now; // 너무 자주 안 두드리게 호출 시간은 찍어둔다
                return Collections.emptyList();
            }

            List<MainFeedCardRes> result = response.getItems().stream()
                    .map(this::toFeedCard)
                    .toList();

            this.cache = result;
            this.lastFetchTime = now;
            this.quotaSleepUntil = null; // 정상 응답이 오면 쿼터 쿨다운 해제

            log.info("[YoutubeClient] YouTube 최신 영상 {}개 갱신, 캐시 저장", result.size());
            return result;

        } catch (HttpClientErrorException e) {
            String body = e.getResponseBodyAsString();
            HttpStatusCode status = e.getStatusCode();

            log.error("[YoutubeClient] YouTube HTTP 에러 status={} body={}", status, body);

            // 🔥 쿼터 초과라면 일정 시간 동안 아예 호출 금지
            if (status == HttpStatus.FORBIDDEN
                    && body != null
                    && body.contains("quotaExceeded")) {

                quotaSleepUntil = now.plusMinutes(cacheMinutes);
                lastFetchTime = now;

                log.warn("[YoutubeClient] YouTube 쿼터 초과(quotaExceeded). {}분 동안 추가 호출 막음 (sleepUntil={})",
                        cacheMinutes, quotaSleepUntil);

                // 캐시가 있으면 캐시, 없으면 빈 리스트
                return (cache != null && !cache.isEmpty())
                        ? cache
                        : Collections.emptyList();
            }

            // 그 외 4xx 에러: 호출 시간만 찍고 캐시/빈 리스트 반환
            lastFetchTime = now;
            return (cache != null && !cache.isEmpty())
                    ? cache
                    : Collections.emptyList();

        } catch (Exception e) {
            log.error("[YoutubeClient] fetchLatestVideos error", e);
            lastFetchTime = now;
            return (cache != null && !cache.isEmpty())
                    ? cache
                    : Collections.emptyList();
        }
    }

    /**
     * YouTube 검색 API 응답 아이템 1개를 MainFeedCardRes 로 변환
     */
    private MainFeedCardRes toFeedCard(YoutubeSearchItem item) {
        YoutubeSnippet snippet = item.getSnippet();

        String videoId = Optional.ofNullable(item.getId())
                .map(YoutubeSearchId::getVideoId)
                .orElse(null);

        String thumbnailUrl = Optional.ofNullable(snippet.getThumbnails())
                .map(t -> {
                    if (t.getMedium() != null) return t.getMedium().getUrl();
                    if (t.getHigh() != null) return t.getHigh().getUrl();
                    if (t.getDefaultThumbnail() != null) return t.getDefaultThumbnail().getUrl();
                    return null;
                })
                .orElse(null);

        OffsetDateTime publishedOffset = OffsetDateTime.parse(snippet.getPublishedAt());
        LocalDateTime createdAt = publishedOffset
                .atZoneSameInstant(ZoneId.of("Asia/Seoul"))
                .toLocalDateTime();

        return MainFeedCardRes.builder()
                .id(null) // 외부 컨텐츠라 굳이 PK 안 줘도 됨
                .section(Mainsection.CONTENT)
                .type(FeedCardType.VIDEO)
                .title(snippet.getTitle())
                .subtitle(snippet.getDescription())
                .thumbnailUrl(thumbnailUrl)
                .membershipOnly(false)
                .createdAt(createdAt)
                .viewCount(0L)      // 원하면 Videos.list API로 실제 조회수 채워도 됨
                .commentCount(0L)
                .reactionCounts(null)
                .linkUrl(videoId != null
                        ? "https://www.youtube.com/watch?v=" + videoId
                        : "https://www.youtube.com/@SKTT1")
                .origin(FeedOrigin.YOUTUBE)
                .originAccount(defaultAccount)
                .build();
    }
}
