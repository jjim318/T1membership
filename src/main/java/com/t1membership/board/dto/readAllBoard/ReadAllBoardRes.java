package com.t1membership.board.dto.readAllBoard;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import com.t1membership.image.domain.ImageEntity;
import lombok.*;

import java.util.Comparator;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadAllBoardRes {

    private Long boardNo;
    private String boardTitle;
    private String boardWriter;
    private String boardContent;
    private int boardLikeCount;
    private BoardType boardType;
    private boolean notice;
    private boolean isSecret;
    // 🔥 썸네일 URL (추가)
    private String thumbnailUrl;


    public static ReadAllBoardRes from(BoardEntity boardEntity) {

        // 이미지 목록 중에서 order == 0 또는 가장 낮은 order 선택
        String thumbnail = boardEntity.getImages().stream()
                .sorted(Comparator.comparing(ImageEntity::getSortOrder))
                .map(ImageEntity::getUrl)   // url 필드
                .findFirst()
                .orElse(null);

        return ReadAllBoardRes.builder()
                .boardNo(boardEntity.getBoardNo())
                .boardTitle(boardEntity.getBoardTitle())
                .boardWriter(boardEntity.getMember().getMemberNickName())
                .boardContent(boardEntity.getBoardContent())
                .boardLikeCount(boardEntity.getBoardLikeCount())
                .boardType(boardEntity.getBoardType())
                .notice(boardEntity.isNotice())
                .isSecret(boardEntity.isSecret())
                .thumbnailUrl(thumbnail)
                .build();
    }

}
