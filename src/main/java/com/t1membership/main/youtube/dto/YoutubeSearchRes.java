package com.t1membership.main.youtube.dto;

import lombok.Data;

import java.util.List;

@Data
public class YoutubeSearchRes {
    private List<YoutubeSearchItem> items;
}

@Data
class YoutubeSearchItem {
    private YoutubeSearchId id;
    private YoutubeSnippet snippet;
}

@Data
class YoutubeSearchId {
    private String kind;
    private String videoId;
}

@Data
class YoutubeSnippet {
    private String title;
    private String description;
    private String publishedAt; // RFC3339(ISO) 문자열
    private YoutubeThumbnails thumbnails;
}

@Data
class YoutubeThumbnails {
    private YoutubeThumbnail defaultThumbnail;
    private YoutubeThumbnail medium;
    private YoutubeThumbnail high;
}

@Data
class YoutubeThumbnail {
    private String url;
    private int width;
    private int height;
}
