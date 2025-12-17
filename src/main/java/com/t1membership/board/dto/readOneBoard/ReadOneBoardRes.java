package com.t1membership.board.dto.readOneBoard;

import com.t1membership.board.domain.BoardEntity;
import com.t1membership.image.domain.ImageEntity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class ReadOneBoardRes {

    private Long boardNo;
    private String boardTitle;

    // ✅ 표시용(닉네임)
    private String boardWriter;

    // ✅ 권한 판정용(이메일)
    private String boardWriterEmail;

    private String boardContent;
    private int boardLikeCount;
    private boolean notice;
    private boolean isSecret;

    private LocalDateTime createdDate;
    private LocalDateTime latestDate;

    // 🔥 컨텐츠 전용
    private String videoUrl;
    private String duration;

    // ✅ 게시글 이미지 목록
    private List<BoardImageRes> images;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BoardImageRes {
        private String fileName;
        private Integer sortOrder;
        private String url; // "/files/xxx.jpg" 또는 저장된 url 그대로
        private String contentType;
    }

    public static ReadOneBoardRes from(BoardEntity boardEntity) {

        List<BoardImageRes> imgs = new ArrayList<>();
        if (boardEntity.getImages() != null) {
            for (ImageEntity img : boardEntity.getImages()) {
                if (img == null) continue;

                String fileName = img.getFileName();
                String url = img.getUrl();

                // ✅ url이 비어있고 fileName만 있으면 /files/로 만들어줌
                if ((url == null || url.isBlank()) && fileName != null && !fileName.isBlank()) {
                    url = "/files/" + fileName;
                }

                // ✅ url이 fileName만 들어온 경우도 방어 (예: "abc.jpg")
                if (url != null && !url.isBlank()
                        && !url.startsWith("http://")
                        && !url.startsWith("https://")
                        && !url.startsWith("/")) {
                    url = "/files/" + url;
                }

                imgs.add(BoardImageRes.builder()
                        .fileName(fileName)
                        .sortOrder(img.getSortOrder())
                        .url(url)
                        .contentType(img.getContentType())
                        .build());
            }
        }

        return ReadOneBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())

                // ✅ 닉네임(표시)
                .boardWriter(boardEntity.getMember() != null ? boardEntity.getMember().getMemberNickName() : null)

                // ✅ 이메일(권한판정)
                .boardWriterEmail(boardEntity.getMember() != null ? boardEntity.getMember().getMemberEmail() : null)

                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .createdDate(boardEntity.getCreateDate())
                .latestDate(boardEntity.getLatestDate())

                .videoUrl(boardEntity.getVideoUrl())
                .duration(boardEntity.getDuration())

                .images(imgs)
                .build();
    }
}
