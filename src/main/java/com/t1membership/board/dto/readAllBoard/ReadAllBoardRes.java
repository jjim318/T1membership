package com.t1membership.board.dto.readAllBoard;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.image.domain.ImageEntity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Comparator;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardRes {

    private Long boardNo;
    private String boardTitle;

    // 닉네임(표시용)
    private String boardWriter;

    // ✅ 추가: 작성자 이메일(권한/소유자 판별용)
    private String boardWriterEmail;

    private String boardContent;
    private int boardLikeCount;
    private BoardType boardType;
    private boolean notice;
    private boolean isSecret;

    // 🔥 썸네일 URL
    private String thumbnailUrl;

    // ✅ 날짜(목록 표시용)
    private LocalDateTime createDate;
    private LocalDateTime latestDate;

    public static ReadAllBoardRes from(BoardEntity boardEntity) {

        String thumbnail = null;
        if (boardEntity.getImages() != null) {
            thumbnail = boardEntity.getImages().stream()
                    .sorted(Comparator.comparing(
                            ImageEntity::getSortOrder,
                            Comparator.nullsLast(Comparator.naturalOrder())
                    ))
                    .map(ImageEntity::getUrl)
                    .findFirst()
                    .orElse(null);
        }

        String writerNick = null;
        String writerEmail = null;

        if (boardEntity.getMember() != null) {
            writerNick = boardEntity.getMember().getMemberNickName();
            writerEmail = boardEntity.getMember().getMemberEmail(); // ✅ 핵심
        }

        return ReadAllBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())
                .boardWriter(writerNick)
                .boardWriterEmail(writerEmail) // ✅ 추가
                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .boardType(boardEntity.getBoardType())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .thumbnailUrl(thumbnail)
                .createDate(boardEntity.getCreateDate())
                .latestDate(boardEntity.getLatestDate())
                .build();
    }
}
