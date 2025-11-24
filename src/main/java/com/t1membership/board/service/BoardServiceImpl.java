package com.t1membership.board.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
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
import com.t1membership.board.repository.BoardRepository;
import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.image.domain.ImageEntity;
import com.t1membership.image.dto.ExistingImageDTO;
import com.t1membership.image.dto.ImageDTO;
import com.t1membership.image.service.FileService;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
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

        if (!StringUtils.hasText(req.getBoardTitle()) || !StringUtils.hasText(req.getBoardContent())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목/내용은 필수입니다.");
        }
        if (req.getBoardType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게시판 타입은 필수입니다.");
        }

        // 공지 작성은 관리자만
        if (Boolean.TRUE.equals(req.getNotice()) && !isAdmin(auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "공지글은 관리자만 작성할 수 있습니다.");
        }

        // 작성자/연관 회원 매핑
        MemberEntity member = memberRepository.findById(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."));

        BoardEntity entity = BoardEntity.builder()
                .member(member)                     // FK: member_email
                .boardWriter(email)                 // 규칙 2: writer = memberEmail
                .boardTitle(req.getBoardTitle().trim())
                .boardContent(req.getBoardContent())
                .boardType(req.getBoardType())
                .boardLikeCount(0)
                .notice(Boolean.TRUE.equals(req.getNotice()))
                .isSecret(Boolean.TRUE.equals(req.getIsSecret()))
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
       삭제 (작성자 or 관리자)
    ======================= */
    @Override
    public DeleteBoardRes deleteBoard(DeleteBoardReq req) {
        Authentication auth = currentAuthOrThrow();
        String email = auth.getName();

        if (req.getBoardNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "게시글 ID가 필요합니다.");
        }

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        boolean ownerOrAdmin = isAdmin(auth) || email.equalsIgnoreCase(board.getBoardWriter());
        if (!ownerOrAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "작성자 또는 관리자만 삭제할 수 있습니다.");
        }

        boardRepository.delete(board);
        return DeleteBoardRes.success(req.getBoardNo());
    }
}
