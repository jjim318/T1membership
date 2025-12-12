package com.t1membership.board.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.dto.content.ContentSummaryRes;
import com.t1membership.board.dto.createBoard.CreateBoardReq;
import com.t1membership.board.dto.createBoard.CreateBoardRes;
import com.t1membership.board.dto.deleteBoard.DeleteBoardReq;
import com.t1membership.board.dto.deleteBoard.DeleteBoardRes;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardReq;
import com.t1membership.board.dto.readAllBoard.ReadAllBoardRes;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardReq;
import com.t1membership.board.dto.readOneBoard.ReadOneBoardRes;
import com.t1membership.board.dto.story.CreateStoryReq;
import com.t1membership.board.dto.story.StoryDetailRes;
import com.t1membership.board.dto.story.StoryFeedRes;
import com.t1membership.board.dto.updateBoard.UpdateBoardReq;
import com.t1membership.board.dto.updateBoard.UpdateBoardRes;
import com.t1membership.board.repository.BoardRepository;
import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.image.domain.ImageEntity;
import com.t1membership.image.dto.ExistingImageDTO;
import com.t1membership.image.dto.ImageDTO;
import com.t1membership.image.service.FileService;
import com.t1membership.member.constant.MemberRole;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
@Log4j2
public class BoardServiceImpl implements BoardService {

    private final FileService fileService;
    private final BoardRepository boardRepository;
    private final MemberRepository memberRepository;

    /* =======================
       공통 유틸
    ======================= */
    private Authentication currentAuthOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return auth;
    }

    private String currentEmailOrThrow() {
        return currentAuthOrThrow().getName();
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(r -> r.equals("ROLE_ADMIN") || r.equals("ADMIN"));
    }

    private BoardType parseBoardTypeOrNull(String typeStr) {
        if (!StringUtils.hasText(typeStr)) return null;
        try {
            return BoardType.valueOf(typeStr.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 게시판 타입입니다.");
        }
    }

    private Sort toSort(String sortBy) {
        // 기본: notice 먼저, 최신순
        if (!StringUtils.hasText(sortBy)) {
            return Sort.by(Sort.Order.desc("notice"), Sort.Order.desc("boardNo"));
        }
        // 필요한 컬럼만 허용(화이트리스트)
        return switch (sortBy) {
            case "latest" -> Sort.by(Sort.Order.desc("notice"), Sort.Order.desc("boardNo"));
            case "oldest" -> Sort.by(Sort.Order.desc("notice"), Sort.Order.asc("boardNo"));
            case "like"   -> Sort.by(Sort.Order.desc("notice"), Sort.Order.desc("boardLikeCount"), Sort.Order.desc("boardNo"));
            default       -> Sort.by(Sort.Order.desc("notice"), Sort.Order.desc("boardNo"));
        };
    }

    /* =======================
       생성
    ======================= */
    @Override
    public CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> images) {
        Authentication auth = currentAuthOrThrow();
        String email = auth.getName();

        boolean hasTitle = StringUtils.hasText(req.getBoardTitle());
        boolean hasContent = StringUtils.hasText(req.getBoardContent());

        if (!hasTitle) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목은 필수입니다.");
        }

        // CONTENT 이외 게시판은 내용도 필수
        if (req.getBoardType() != BoardType.CONTENT && !hasContent) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내용은 필수입니다.");
        }

        // 공지 작성은 관리자만
        if (Boolean.TRUE.equals(req.getNotice()) && !isAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "공지글은 관리자만 작성할 수 있습니다.");
        }

        // 작성자/연관 회원 매핑
        MemberEntity member = memberRepository.findById(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."));

        // 🔥 CONTENT 타입 게시글은 컨텐츠 담당자만 작성 가능
        if (req.getBoardType() == BoardType.CONTENT && !member.isContentManager()) {
            // isContentManager() 는 MemberEntity 안에 만든 boolean getter
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "컨텐츠 게시판은 담당 관리자만 작성할 수 있습니다."
            );
        }

        BoardEntity entity = BoardEntity.builder()
                .member(member)                     // FK: member_email
                .boardWriter(email)                 // 규칙 2: writer = memberEmail
                .boardTitle(req.getBoardTitle().trim())
                .boardContent(req.getBoardContent())
                .boardType(req.getBoardType())
                .boardLikeCount(0)
                .notice(Boolean.TRUE.equals(req.getNotice()))
                .isSecret(Boolean.TRUE.equals(req.getIsSecret()))
                .categoryCode(req.getCategoryCode())
                // 🔥 컨텐츠 전용 필드 세팅 (일반 게시글이면 null 그대로 들어감)
                .videoUrl(req.getVideoUrl())
                .duration(req.getDuration())
                .build();

        BoardEntity saved = boardRepository.save(entity);

        // 2) 이미지가 있으면 파일 저장 + ImageEntity 연결
        if (images != null && !images.isEmpty()) {
            int order = 0;
            for (MultipartFile file : images) {
                if (file.isEmpty()) continue;

                // (1) 파일 시스템 저장 + 메타 정보 생성
                ImageDTO dto = fileService.uploadFile(file, order++);

                // (2) DTO -> 엔티티 + 게시글 연결
                ImageEntity image = ImageEntity.fromDtoForBoard(dto, saved);

                // (3) 양방향 연관관계
                saved.addImage(image);
            }
        }

        return CreateBoardRes.from(saved);
    }



    /* =======================
       단건 조회 (비밀글 규칙 적용)
    ======================= */
    @Override
    @Transactional(readOnly = true)
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq req) {
        if (req.getBoardNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게시글 ID가 필요합니다.");
        }

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        if (board.isSecret()) {
            Authentication auth = currentAuthOrThrow();
            String email = auth.getName();
            if (!(isAdmin(auth) || email.equalsIgnoreCase(board.getBoardWriter()))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비밀글은 본인과 관리자만 조회할 수 있습니다.");
            }
        }

        return ReadOneBoardRes.from(board);
    }

    /* =======================
       목록 조회 (비밀글 필터링)
    ======================= */
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ReadAllBoardRes> readAllBoard(ReadAllBoardReq req) {
        // 정렬/페이징 조립
        Sort sort = toSort(req.getSortBy());
        Pageable pageable = PageRequest.of(
                Math.max(0, req.getPage()),
                Math.max(1, req.getSize()),
                sort
        );

        BoardType type = parseBoardTypeOrNull(req.getBoardType());
        Page<BoardEntity> page = boardRepository.searchByType(type, pageable);

        // 비밀글 노출 규칙: 본인/관리자만 → 외부 사용자에게는 숨김
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean loggedIn = (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken));
        String email = loggedIn ? auth.getName() : null;
        boolean admin = loggedIn && isAdmin(auth);

        List<ReadAllBoardRes> visible = page
                .stream()
                .filter(b -> !b.isSecret() || admin || (email != null && email.equalsIgnoreCase(b.getBoardWriter())))
                .map(ReadAllBoardRes::from)
                .toList();

        // PageResponseDTO 구성 (아이템과 동일 스타일)
        PageRequestDTO pr = PageRequestDTO.builder()
                .page(req.getPage())
                .size(req.getSize())
                .build();

        return PageResponseDTO.<ReadAllBoardRes>withAll()
                .pageRequestDTO(pr)
                .dtoList(visible)
                .total((int) page.getTotalElements()) // ※ 비밀글 필터링 후 total을 별도로 조정하려면 여기 로직을 바꿔드릴 수 있습니다.
                .build();
    }

    /* =======================
       수정 (작성자 or 관리자)
    ======================= */
    @Override
    @Transactional
    public UpdateBoardRes updateBoard(UpdateBoardReq req,
                                      List<ExistingImageDTO> existingImages,
                                      List<MultipartFile> newImages) {

        Authentication auth = currentAuthOrThrow();
        String email = auth.getName();

        if (req.getBoardNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게시글 ID가 필요합니다.");
        }

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        boolean ownerOrAdmin = isAdmin(auth) || email.equalsIgnoreCase(board.getBoardWriter());
        if (!ownerOrAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "작성자 또는 관리자만 수정할 수 있습니다.");
        }

        // ====== 기본 텍스트 정보 수정 ======
        if (StringUtils.hasText(req.getBoardTitle())) {
            board.setBoardTitle(req.getBoardTitle().trim());
        }
        if (StringUtils.hasText(req.getBoardContent())) {
            board.setBoardContent(req.getBoardContent());
        }
        if (req.getBoardType() != null) {
            board.setBoardType(req.getBoardType());
        }
        // 공지 플래그는 관리자만 변경
        if (req.getNotice() != null) {
            if (!isAdmin(auth)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "공지 설정은 관리자만 가능합니다.");
            }
            board.setNotice(req.getNotice());
        }
        if (req.getIsSecret() != null) {
            board.setSecret(req.getIsSecret());
        }

        // ====== 기존 이미지 정리 (삭제 + 정렬 변경) ======
        Map<String, Integer> keepMap = new HashMap<>();
        if (existingImages != null) {
            for (ExistingImageDTO dto : existingImages) {
                if (dto.getFileName() != null) {
                    keepMap.put(dto.getFileName(), dto.getSortOrder());
                }
            }
        }

        // 현재 게시글에 달린 이미지들을 복사해서 순회
        List<ImageEntity> currentImages = new ArrayList<>(board.getImages());

        for (ImageEntity img : currentImages) {
            String fileName = img.getFileName();

            // existingImages 목록에 없는 애들은 삭제
            if (!keepMap.containsKey(fileName)) {
                if (fileName != null) {
                    fileService.deleteFile(fileName);   // 실제 파일 삭제
                }
                board.removeImage(img);                 // 연관관계 제거 (orphanRemoval로 DB row 삭제)
            } else {
                // 남길 이미지면 sortOrder 갱신
                Integer newOrder = keepMap.get(fileName);
                img.setSortOrder(newOrder != null ? newOrder : 0);
            }
        }

        // ====== 새 이미지 추가 ======
        int orderStart = 0;
        if (board.getImages() != null && !board.getImages().isEmpty()) {
            orderStart = board.getImages().stream()
                    .map(ImageEntity::getSortOrder)
                    .filter(Objects::nonNull)
                    .max(Integer::compareTo)
                    .orElse(0) + 1;
        }

        if (newImages != null && !newImages.isEmpty()) {
            int order = orderStart;
            for (MultipartFile file : newImages) {
                if (file == null || file.isEmpty()) continue;

                // 파일 시스템에 저장 + 메타정보 생성
                ImageDTO dto = fileService.uploadFile(file, order++);

                // DTO -> 엔티티 변환 + 게시글 연결
                ImageEntity image = ImageEntity.fromDtoForBoard(dto, board);
                board.addImage(image);
            }
        }

        // 영속 엔티티라 더티체킹으로 텍스트 + 이미지 변경 모두 반영됨
        return UpdateBoardRes.from(board);
    }


    /* =======================
       삭제 (작성자 or 관리자 or 컨텐츠매니저)
    ======================= */
    @Override
    public DeleteBoardRes deleteBoard(DeleteBoardReq req) {
        Authentication auth = currentAuthOrThrow();
        String email = auth.getName();

        if (req.getBoardNo() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "게시글 ID가 필요합니다."
            );
        }

        log.info("🔥 [DELETE-SERVICE] email={}", email);

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "게시글을 찾을 수 없습니다."
                        )
                );

        MemberEntity member = memberRepository.findByMemberEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "회원 정보를 찾을 수 없습니다."
                        )
                );

        // 🔥 작성자인지
        boolean isWriter = email.equalsIgnoreCase(
                board.getMember().getMemberEmail()
        );

        // 🔥 관리자 / 컨텐츠 매니저인지 (ADMIN, ADMIN_CONTENT, content_manager=true 포함)
        boolean isManager = member.isContentManager();

        log.info("🔥 [DELETE-SERVICE] isWriter={}, isManager={}, role={}",
                isWriter, isManager, member.getMemberRole());

        boolean ownerOrAdmin = isWriter || isManager;
        if (!ownerOrAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "작성자 또는 관리자만 삭제할 수 있습니다."
            );
        }

        boardRepository.delete(board);
        return DeleteBoardRes.success(req.getBoardNo());
    }



    @Override
    @Transactional(readOnly = true)
    public List<ContentSummaryRes> readContentBoards() {

        // 최신순으로 최대 100개 정도만
        Pageable pageable = PageRequest.of(
                0,
                100,
                Sort.by(Sort.Order.desc("boardNo"))
        );

        // 기존에 쓰던 searchByType 재사용 (BoardType.CONTENT)
        var page = boardRepository.searchByType(BoardType.CONTENT, pageable);

        return page.stream()
                .map(ContentSummaryRes::from)
                .toList();
    }

    // =========================
    // 스토리 작성 (board + images 같이 저장)
    // =========================
    @Override
    @Transactional
    public void createStory(String memberEmail, CreateStoryReq req) {

        MemberEntity member = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보가 없습니다."));

        MemberRole role = member.getMemberRole();

        if (!isStoryWriter(role)) {
            throw new AccessDeniedException("스토리 작성 권한이 없습니다.");
        }

        // ✅ role 기반 writer 강제
        String writer = resolveWriterByRole(role);

        // ✅ 선수 role과 playerKey 불일치 차단
        validatePlayerKeyConsistency(member, role, writer);

        BoardEntity board = BoardEntity.builder()
                .boardType(BoardType.STORY)
                .member(member)
                .boardWriter(writer)
                .boardTitle(req.getTitle())
                .boardContent(req.getContent() == null ? "" : req.getContent())
                .isSecret(req.isLocked())
                .boardLikeCount(0)
                .notice(false)
                .build();

        // ✅ imageUrls -> ImageEntity로 변환해서 board.images에 붙임
        List<String> imageUrls = req.getImageUrls();
        if (imageUrls != null && !imageUrls.isEmpty()) {
            int order = 0;
            for (String raw : imageUrls) {
                if (raw == null) continue;
                String url = raw.trim();
                if (url.isEmpty()) continue;

                ImageEntity img = ImageEntity.create(url, order++);

                // 관계 세팅 (BoardEntity에 addImage()가 있음)
                board.addImage(img);
            }
        }

        // ✅ cascade = ALL 이라서 board만 save해도 images 같이 저장됨
        boardRepository.save(board);
    }

    // =========================
    // 스토리 피드
    // =========================
    @Override
    public Page<StoryFeedRes> getStoryFeed(String writer, Pageable pageable) {

        Page<BoardEntity> page;

        if (writer == null || writer.isBlank()) {
            page = boardRepository.findByBoardType(BoardType.STORY, pageable);
        } else {
            page = boardRepository.findByBoardTypeAndBoardWriter(BoardType.STORY, writer, pageable);
        }

        return page.map(board -> {
            String thumb = null;
            if (board.getImages() != null && !board.getImages().isEmpty()) {
                // @OrderBy 때문에 0번이 대표 이미지
                thumb = readImageUrl(board.getImages().get(0));
            }

            return StoryFeedRes.builder()
                    .boardNo(board.getBoardNo())
                    .writer(board.getBoardWriter())
                    .title(board.getBoardTitle())
                    .contentPreview(preview(board.getBoardContent()))
                    .locked(board.isSecret())
                    .likeCount(board.getBoardLikeCount())
                    .thumbnailUrl(thumb)
                    .build();
        });
    }

    // =========================
    // 스토리 상세
    // =========================
    @Override
    public StoryDetailRes getStoryDetail(Long boardNo) {

        BoardEntity board = boardRepository.findById(boardNo)
                .orElseThrow(() -> new IllegalArgumentException("스토리 없음"));

        if (board.getBoardType() != BoardType.STORY) {
            throw new IllegalArgumentException("스토리가 아닙니다.");
        }

        List<String> urls = new ArrayList<>();
        if (board.getImages() != null) {
            for (ImageEntity img : board.getImages()) {
                String u = readImageUrl(img);
                if (u != null && !u.isBlank()) urls.add(u);
            }
        }

        return StoryDetailRes.builder()
                .boardNo(board.getBoardNo())
                .writer(board.getBoardWriter())
                .title(board.getBoardTitle())
                .content(board.getBoardContent())
                .locked(board.isSecret())
                .likeCount(board.getBoardLikeCount())
                .imageUrls(urls)
                .build();
    }

    // =========================
    // 내부 유틸
    // =========================
    private boolean isStoryWriter(MemberRole role) {
        return role == MemberRole.ADMIN
                || role == MemberRole.ADMIN_CONTENT
                || role == MemberRole.T1
                || role == MemberRole.PLAYER_DORAN
                || role == MemberRole.PLAYER_ONER
                || role == MemberRole.PLAYER_FAKER
                || role == MemberRole.PLAYER_GUMAYUSI
                || role == MemberRole.PLAYER_KERIA;
    }

    private String resolveWriterByRole(MemberRole role) {
        return switch (role) {
            case ADMIN, ADMIN_CONTENT, T1 -> "T1";
            case PLAYER_DORAN -> "doran";
            case PLAYER_ONER -> "oner";
            case PLAYER_FAKER -> "faker";
            case PLAYER_GUMAYUSI -> "gumayusi";
            case PLAYER_KERIA -> "keria";
            default -> throw new AccessDeniedException("스토리 작성 권한이 없습니다.");
        };
    }

    private void validatePlayerKeyConsistency(MemberEntity member, MemberRole role, String writer) {
        if (role == MemberRole.ADMIN || role == MemberRole.ADMIN_CONTENT || role == MemberRole.T1) return;

        String pk = member.getPlayerKey();
        if (pk == null || pk.isBlank()) {
            throw new IllegalStateException("선수 계정에 playerKey가 설정되어 있지 않습니다.");
        }

        if (!pk.trim().equalsIgnoreCase(writer)) {
            throw new AccessDeniedException("선수 계정 정보(playerKey)와 권한(role)이 일치하지 않습니다.");
        }
    }

    private String preview(String content) {
        if (content == null) return "";
        return content.length() > 120 ? content.substring(0, 120) + "..." : content;
    }

    // ✅ ImageEntity에서 이미지 URL 꺼내는 유틸 (필드명 맞추면 됨)
    private String readImageUrl(ImageEntity img) {
        if (img == null) return null;

        // ================================
        // 🔥 TODO: 형님 ImageEntity getter에 맞춰 여기만 수정해도 됨
        // 예) return img.getImageUrl();
        // 예) return img.getFilePath();
        // ================================
        return img.getUrl();
    }

}
