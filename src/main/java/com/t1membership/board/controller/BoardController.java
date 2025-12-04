package com.t1membership.board.controller;

import com.t1membership.ApiResult;
import com.t1membership.board.constant.BoardType;
import com.t1membership.board.dto.content.ContentSummaryRes;
import com.t1membership.board.dto.createBoard.CreateBoardReq;
import com.t1membership.board.dto.createBoard.CreateBoardRes;
import com.t1membership.board.dto.deleteBoard.DeleteBoardReq;
import com.t1membership.board.dto.deleteBoard.DeleteBoardRes;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardReq;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardRes;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardReq;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardRes;
import com.t1membership.board.dto.updateBoard.UpdateBoardReq;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import com.t1membership.board.service.BoardService;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.image.dto.ExistingImageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/board")
@RequiredArgsConstructor
@Log4j2
public class BoardController {

    private final BoardService boardService;

    // ====== 🔥 컨텐츠 전용 등록 (ADMIN / ADMIN_CONTENT) ======
    @PostMapping(
            value = "/content",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResult<CreateBoardRes> createContentBoard(
            // 폼 필드들
            @RequestParam("title") String title,
            @RequestParam("category") String categoryCode,   // ONWORLD_T1, T_HIND ...
            @RequestParam(value = "seriesName", required = false) String seriesName,
            @RequestParam("videoUrl") String videoUrl,
            @RequestParam(value = "duration", required = false) String duration,
            @RequestParam(value = "summary", required = false) String summary,
            @RequestParam(value = "isPublic", required = false, defaultValue = "true")
            Boolean isPublic,

            // 썸네일 파일 (선택)
            @RequestPart(value = "thumbnail", required = false)
            MultipartFile thumbnail
    ) {
        log.info("[BoardContent] POST /board/content called. title={}", title);

        // 0) 기본 검증 – 여기서 막히면 createBoard까지 안 감
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목은 필수입니다.");
        }
        if (videoUrl == null || videoUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "영상 URL은 필수입니다.");
        }

        // 1) CONTENT 게시판에 들어갈 본문(요약) 구성
        String content = (summary != null && !summary.isBlank())
                ? summary
                : "";   // 🔥 이제는 영상 URL을 여기 안 넣고, 전용 필드로 뺌

        // 2) CreateBoardReq 로 매핑 (BoardType.CONTENT 고정)
        CreateBoardReq req = CreateBoardReq.builder()
                .boardTitle(title.trim())
                .boardContent(content)              // 🔥 null/빈문자 방지
                .boardType(BoardType.CONTENT)      // 컨텐츠 고정
                .notice(false)                     // 컨텐츠는 공지 X
                .isSecret(false)                   // 필요하면 isPublic 반대로 활용 가능
                .categoryCode(categoryCode)        // BoardEntity.categoryCode 로 들어감
                // 🔥 컨텐츠 전용 필드 전달
                .videoUrl(videoUrl)
                .duration(duration)
                .build();

        // 3) 썸네일을 Board 이미지로 재사용
        List<MultipartFile> images = (thumbnail != null && !thumbnail.isEmpty())
                ? List.of(thumbnail)
                : List.of();

        log.info("[BoardContent] create content start title={}, category={}, isPublic={}, hasThumbnail={}",
                title, categoryCode, isPublic, (thumbnail != null && !thumbnail.isEmpty()));

        try {
            CreateBoardRes res = boardService.createBoard(req, images);
            log.info("[BoardContent] create content success boardNo={}", res.getBoardNo());
            return new ApiResult<>(res);
        } catch (Exception e) {
            log.error("[BoardContent] create content error", e);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "컨텐츠 등록 중 서버 오류가 발생했습니다."
            );
        }
    }



    // ====== 게시글 등록 (텍스트 + 새 이미지들) ======
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<CreateBoardRes> createBoard(
            @ModelAttribute CreateBoardReq postReq,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) {
        log.info("[BoardGeneral] POST /board called. title={}", postReq.getBoardTitle());
        var postRes = boardService.createBoard(postReq, images);
        return new ApiResult<>(postRes);
    }

    // ====== 게시글 수정 (텍스트 + 기존 이미지 정보 + 새 이미지들) ======
    @PutMapping(value = "/{boardNo}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<UpdateBoardRes> updateBoard(
            @PathVariable Long boardNo,
            @ModelAttribute UpdateBoardReq putReq,
            @RequestPart(value = "existingImages", required = false) List<ExistingImageDTO> existingImages,
            @RequestPart(value = "images", required = false) List<MultipartFile> newImages
    ) {
        putReq = putReq.toBuilder()
                .boardNo(boardNo)
                .build();

        var putRes = boardService.updateBoard(putReq, existingImages, newImages);
        return new ApiResult<>(putRes);
    }


    @DeleteMapping("/{boardNo}")
    public ApiResult<DeleteBoardRes> deleteBoard(@PathVariable Long boardNo) {
        DeleteBoardReq deleteReq = DeleteBoardReq.builder().boardNo(boardNo).build();
        var deleteRes = boardService.deleteBoard(deleteReq);
        return new ApiResult<>(deleteRes);
    }


    // ====== 🔥 컨텐츠 목록 조회 (메인 /content 페이지 용) ======
    @GetMapping("/content")
    public ApiResult<List<ContentSummaryRes>> readContentBoards() {
        log.info("[BoardContent] read content list start");
        var list = boardService.readContentBoards();
        log.info("[BoardContent] read content list size={}", list.size());
        return new ApiResult<>(list);
    }


    @GetMapping({"/{boardNo}", "/{boardNo}/edit"})
    public ApiResult<ReadOneBoardRes> readOneBoard(@PathVariable Long boardNo) {
        ReadOneBoardReq readReq = ReadOneBoardReq.builder().boardNo(boardNo).build();
        var readRes = boardService.readOneBoard(readReq);
        return new ApiResult<>(readRes);
    }


    @GetMapping
    public ApiResult<PageResponseDTO<ReadAllBoardRes>> readAllBoards(@ModelAttribute ReadAllBoardReq readReq) {
        var readAllRes = boardService.readAllBoard(readReq);
        return new ApiResult<>(readAllRes);
    }

}
