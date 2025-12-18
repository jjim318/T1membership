package com.t1membership.board.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.constant.CommunityCategoryCode;
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
import com.t1membership.board.repository.BoardLikeRepository;
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
    private final StoryLikeService storyLikeService;
    private final BoardLikeRepository boardLikeRepository;

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
                .anyMatch(r -> r.equals("ROLE_ADMIN") || r.equals("ADMIN") || r.equals("ROLE_MANAGER") || r.equals("MANAGER"));
    }

    private boolean isLoggedIn(Authentication auth) {
        return auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
    }

    private boolean isPlayerRole(MemberRole role) {
        if (role == null) return false;
        return role.name().startsWith("PLAYER_");
    }

    private boolean isMembershipActive(MemberEntity member) {
        if (member == null) return false;
        // ⚠️ 형님 DB 컬럼: membership_type (MemberEntity.getMembershipType() or getMembershipPayType() 등)
        // 여기서는 "NO_MEMBERSHIP" 문자열 기준으로 이미 프론트와 맞춰진 전제가 있으니,
        // MemberEntity getter에 맞게 아래 한 줄만 형님 프로젝트에 맞춰 쓰시면 됩니다.
        // 예) return member.getMembershipType() != MembershipType.NO_MEMBERSHIP;
        String mt = (member.getMembershipType() != null ? member.getMembershipType().name() : "NO_MEMBERSHIP");
        return !"NO_MEMBERSHIP".equalsIgnoreCase(mt);
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
            case "like" -> Sort.by(Sort.Order.desc("notice"), Sort.Order.desc("boardLikeCount"), Sort.Order.desc("boardNo"));
            default -> Sort.by(Sort.Order.desc("notice"), Sort.Order.desc("boardNo"));
        };
    }

    private void validateCommunityCategoryOrThrow(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "커뮤니티 categoryCode 는 필수입니다. (ABOUT/LOUNGE/TO_T1)");
        }
        try {
            CommunityCategoryCode.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 커뮤니티 categoryCode 입니다. (ABOUT/LOUNGE/TO_T1)");
        }
    }

    private MemberEntity currentMemberOrThrow(String email) {
        return memberRepository.findByMemberEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."));
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

        // 작성자 회원
        MemberEntity member = memberRepository.findById(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."));

        // 🔥 CONTENT 타입 게시글은 컨텐츠 담당자만
        if (req.getBoardType() == BoardType.CONTENT && !member.isContentManager()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "컨텐츠 게시판은 담당 관리자만 작성할 수 있습니다."
            );
        }

        // =========================
        // ✅ COMMUNITY 작성 권한
        // =========================
        if (req.getBoardType() == BoardType.COMMUNITY) {
            validateCommunityCategoryOrThrow(req.getCategoryCode());

            boolean admin = isAdmin(auth);
            boolean membership = isMembershipActive(member);
            boolean player = isPlayerRole(member.getMemberRole()); // 🔥 선수 특권

            CommunityCategoryCode cc =
                    CommunityCategoryCode.valueOf(req.getCategoryCode().trim().toUpperCase());

            // 🔥 핵심: 관리자 OR 멤버십 OR 선수
            if (!admin && !membership && !player) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "멤버십 회원만 작성할 수 있습니다."
                );
            }

            // LOUNGE: 선수 계정은 작성 불가 (형님 정책 유지)
            if (cc == CommunityCategoryCode.LOUNGE && !admin && player) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "스타에게 노출되지 않는 비공개 보드에요. 선수 계정은 이용할 수 없습니다."
                );
            }
        }

        BoardEntity entity = BoardEntity.builder()
                .member(member)                 // FK
                .boardWriter(email)             // writer = memberEmail
                .boardTitle(req.getBoardTitle().trim())
                .boardContent(req.getBoardContent())
                .boardType(req.getBoardType())
                .boardLikeCount(0)
                .notice(Boolean.TRUE.equals(req.getNotice()))
                .isSecret(Boolean.TRUE.equals(req.getIsSecret()))
                .categoryCode(req.getCategoryCode())
                .videoUrl(req.getVideoUrl())
                .duration(req.getDuration())
                .build();

        BoardEntity saved = boardRepository.save(entity);

        // 이미지 저장
        if (images != null && !images.isEmpty()) {
            int order = 0;
            for (MultipartFile file : images) {
                if (file.isEmpty()) continue;

                ImageDTO dto = fileService.uploadFile(file, order++);
                ImageEntity image = ImageEntity.fromDtoForBoard(dto, saved);
                saved.addImage(image);
            }
        }

        return CreateBoardRes.from(saved);
    }

    /* =======================
       단건 조회 (비밀글 규칙 적용)
       + COMMUNITY TO_T1 규칙: 관리자 OR 작성자만 조회 가능
       + LOUNGE 규칙: 선수계정은 접근 불가 (관리자 제외)
    ======================= */
    @Override
    @Transactional(readOnly = true)
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq req) {
        if (req.getBoardNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게시글 ID가 필요합니다.");
        }

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean loggedIn = isLoggedIn(auth);
        boolean admin = loggedIn && isAdmin(auth);
        String email = loggedIn ? auth.getName() : null;

        // ✅ 작성자 이메일(엔티티 member로 판정: boardWriter(닉네임) 쓰면 안됨)
        String writerEmail = null;
        if (board.getMember() != null) {
            writerEmail = board.getMember().getMemberEmail();
        }
        boolean owner = (email != null && writerEmail != null && email.equalsIgnoreCase(writerEmail));

        // ✅ COMMUNITY 접근 규칙
        if (board.getBoardType() == BoardType.COMMUNITY) {
            // 로그인 필수
            if (!loggedIn) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }

            MemberEntity me = currentMemberOrThrow(email);

            // ✅ 멤버십 특권: 관리자 OR 멤버십 OR 선수
            boolean membershipPrivilege =
                    admin
                            || isMembershipActive(me)
                            || isPlayerRole(me.getMemberRole());

            if (!membershipPrivilege) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "멤버십 회원에게 공개된 페이지예요.");
            }

            String ccRaw = board.getCategoryCode();
            validateCommunityCategoryOrThrow(ccRaw);
            CommunityCategoryCode cc = CommunityCategoryCode.valueOf(ccRaw.trim().toUpperCase());

            // LOUNGE: 선수 접근 불가(관리자 제외)
            if (cc == CommunityCategoryCode.LOUNGE && !admin && isPlayerRole(me.getMemberRole())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "스타에게 노출되지 않는 비공개 보드에요. 선수 계정은 접근할 수 없습니다.");
            }

            // TO_T1: 읽기 = 관리자 OR 작성자
            if (cc == CommunityCategoryCode.TO_T1) {
                if (!admin && !owner) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "매니저 또는 작성자만 열람할 수 있는 비공개 보드에요.");
                }
            }
        }

        // ✅ 기존 비밀글 규칙: 본인/관리자만
        if (board.isSecret()) {
            if (!loggedIn) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }
            if (!(admin || owner)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비밀글은 본인과 관리자만 조회할 수 있습니다.");
            }
        }

        return ReadOneBoardRes.from(board);
    }

    /* =======================
       목록 조회 (비밀글 필터링)
       + COMMUNITY 분류/권한/TO_T1 mineOnly 지원
    ======================= */
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ReadAllBoardRes> readAllBoard(ReadAllBoardReq req) {
        // 정렬/페이징
        Sort sort = toSort(req.getSortBy());
        Pageable pageable = PageRequest.of(
                Math.max(0, req.getPage()),
                Math.max(1, req.getSize()),
                sort
        );

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean loggedIn = isLoggedIn(auth);
        String email = loggedIn ? auth.getName() : null;
        boolean admin = loggedIn && isAdmin(auth);

        Page<BoardEntity> page;

        // ✅ BoardType: ReadAllBoardReq에서 enum으로 받는다고 가정
        BoardType type = req.getBoardType();

        // ==========================
        // ✅ COMMUNITY 목록 정책
        // ==========================
        if (type == BoardType.COMMUNITY) {
            // 로그인 필수
            if (!loggedIn) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }

            MemberEntity me = currentMemberOrThrow(email);

            // 🔥 기존
            // boolean membership = admin || isMembershipActive(me);

            // ✅ 수정: 선수 포함
            boolean membership =
                    admin
                            || isMembershipActive(me)
                            || isPlayerRole(me.getMemberRole());


            if (!membership && !admin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "멤버십 회원에게 공개된 페이지예요.");
            }

            // categoryCode 필수 + 검증
            validateCommunityCategoryOrThrow(req.getCategoryCode());
            CommunityCategoryCode cc = CommunityCategoryCode.valueOf(req.getCategoryCode().trim().toUpperCase());

            // LOUNGE: 선수 접근 불가(관리자 제외)
            if (cc == CommunityCategoryCode.LOUNGE && !admin && isPlayerRole(me.getMemberRole())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "스타에게 노출되지 않는 비공개 보드에요. 선수 계정은 접근할 수 없습니다.");
            }

            boolean mineOnly = Boolean.TRUE.equals(req.getMineOnly());

            // TO_T1: 멤버십 유저는 "내 글만" 조회가 원칙 (형님 정책)
            // - 프론트에서 mineOnly=true로 보내는 방식
            // - 관리자는 mineOnly 무시하고 전체 조회 가능
//            if (cc == CommunityCategoryCode.TO_T1 && !admin) {
//                mineOnly = true;
//            }

            if (mineOnly) {
                // ✅ Repository에 이 메서드가 이미 추가되어 있어야 합니다.
                page = boardRepository.findByBoardTypeAndCategoryCodeAndMember_MemberEmail(
                        BoardType.COMMUNITY,
                        cc.name(),
                        email,
                        pageable
                );
            } else {
                // ✅ Repository에 이 메서드가 이미 추가되어 있어야 합니다.
                page = boardRepository.findByBoardTypeAndCategoryCode(
                        BoardType.COMMUNITY,
                        cc.name(),
                        pageable
                );
            }

        } else {
            // ==========================
            // 기존 로직 (커뮤니티 외)
            // ==========================
            page = boardRepository.searchByType(type, pageable);
        }

        // ==========================
        // ✅ 비밀글 필터링: 본인/관리자만
        // ==========================
        List<ReadAllBoardRes> visible = page.stream()
                .filter(b -> !b.isSecret() || admin || (email != null && email.equalsIgnoreCase(b.getBoardWriter())))
                .map(ReadAllBoardRes::from)
                .toList();

        // PageResponseDTO 구성
        PageRequestDTO pr = PageRequestDTO.builder()
                .page(req.getPage())
                .size(req.getSize())
                .build();

        return PageResponseDTO.<ReadAllBoardRes>withAll()
                .pageRequestDTO(pr)
                .dtoList(visible)
                .total((int) page.getTotalElements())
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

        List<ImageEntity> currentImages = new ArrayList<>(board.getImages());

        for (ImageEntity img : currentImages) {
            String fileName = img.getFileName();

            if (!keepMap.containsKey(fileName)) {
                if (fileName != null) {
                    fileService.deleteFile(fileName);
                }
                board.removeImage(img);
            } else {
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

                ImageDTO dto = fileService.uploadFile(file, order++);
                ImageEntity image = ImageEntity.fromDtoForBoard(dto, board);
                board.addImage(image);
            }
        }

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

        boolean isWriter = email.equalsIgnoreCase(
                board.getMember().getMemberEmail()
        );

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

        Pageable pageable = PageRequest.of(
                0,
                100,
                Sort.by(Sort.Order.desc("boardNo"))
        );

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

        String writer = resolveWriterByRole(role);

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

        List<String> imageUrls = req.getImageUrls();
        if (imageUrls != null && !imageUrls.isEmpty()) {
            int order = 0;
            for (String raw : imageUrls) {
                if (raw == null) continue;
                String url = raw.trim();
                if (url.isEmpty()) continue;

                ImageEntity img = ImageEntity.create(url, order++);
                board.addImage(img);
            }
        }

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
    @Transactional(readOnly = true)
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

        // ✅ 로그인한 경우에만 likedByMe 계산
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean loggedIn = isLoggedIn(auth);
        String email = loggedIn ? auth.getName() : null;

        boolean likedByMe = false;
        if (loggedIn && email != null) {
            likedByMe = boardLikeRepository
                    .findByBoard_BoardNoAndMember_MemberEmail(boardNo, email)
                    .isPresent();
        }

        return StoryDetailRes.builder()
                .boardNo(board.getBoardNo())
                .writer(board.getBoardWriter())
                .title(board.getBoardTitle())
                .content(board.getBoardContent())
                .locked(board.isSecret())
                .likeCount(board.getBoardLikeCount())
                .likedByMe(likedByMe)     // ✅ 추가
                .imageUrls(urls)
                .createdDate(board.getCreateDate())
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

    private String readImageUrl(ImageEntity img) {
        if (img == null) return null;
        return img.getUrl();
    }
}
