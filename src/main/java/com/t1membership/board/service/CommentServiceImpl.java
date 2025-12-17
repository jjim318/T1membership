package com.t1membership.board.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.constant.CommunityCategoryCode;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.domain.CommentEntity;
import com.t1membership.board.dto.createComment.CreateCommentReq;
import com.t1membership.board.dto.createComment.CreateCommentRes;
import com.t1membership.board.dto.deleteComment.DeleteCommentReq;
import com.t1membership.board.dto.deleteComment.DeleteCommentRes;
import com.t1membership.board.dto.readComment.ReadCommentReq;
import com.t1membership.board.dto.readComment.ReadCommentRes;
import com.t1membership.board.dto.updateComment.UpdateCommentReq;
import com.t1membership.board.dto.updateComment.UpdateCommentRes;
import com.t1membership.board.repository.BoardRepository;
import com.t1membership.board.repository.CommentRepository;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final BoardRepository boardRepository;
    private final MemberRepository memberRepository;

    // =========================
    // Auth Utils
    // =========================

    private Authentication currentAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private boolean isLoggedIn(Authentication auth) {
        return auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
    }

    private boolean isAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority())
                        || "ROLE_MANAGER".equals(a.getAuthority())
                        || "ADMIN".equals(a.getAuthority())
                        || "MANAGER".equals(a.getAuthority())
        );
    }

    private MemberEntity currentMemberOrThrow(String email) {
        return memberRepository.findById(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보를 찾을 수 없습니다."));
    }

    private boolean isPlayerRole(Object role) {
        // role 타입이 enum이든 String이든 상관없이 안전 처리
        return role != null && role.toString().startsWith("PLAYER");
    }

    /**
     * ✅ 형님이 "편하게" 가자고 했으니
     * 멤버십 활성 판정은 일단 우회(항상 true)로 두겠습니다.
     *
     * 나중에 '멤버십 주문/만료' 로직이 정해지면 여기만 교체하면 됩니다.
     */
    private boolean isMembershipActive(MemberEntity me) {
        return true; // TODO: 진짜 멤버십 판정으로 교체
    }

    private void validateCommunityCategoryOrThrow(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "categoryCode가 필요합니다.");
        }
        try {
            CommunityCategoryCode.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 categoryCode 입니다.");
        }
    }

    // =========================
    // Board 접근 정책(댓글도 동일 적용)
    // =========================

    private void assertCanAccessBoard(BoardEntity board) {
        Authentication auth = currentAuth();
        boolean loggedIn = isLoggedIn(auth);
        boolean admin = loggedIn && isAdmin(auth);
        String email = loggedIn ? auth.getName() : null;

        // 커뮤니티 외 댓글 정책은 필요 시 추가
        if (board.getBoardType() != BoardType.COMMUNITY) {
            return;
        }

        // 로그인 필수
        if (!loggedIn) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        MemberEntity me = currentMemberOrThrow(email);

        // ✅ 특권: 관리자 OR 선수 OR (임시)멤버십(true)
        boolean membershipPrivilege =
                admin
                        || isPlayerRole(me.getMemberRole())
                        || isMembershipActive(me);

        if (!membershipPrivilege) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "멤버십 회원에게 공개된 페이지예요.");
        }

        // categoryCode 검증
        String ccRaw = board.getCategoryCode();
        validateCommunityCategoryOrThrow(ccRaw);
        CommunityCategoryCode cc = CommunityCategoryCode.valueOf(ccRaw.trim().toUpperCase());

        // LOUNGE: 선수 접근 불가(관리자 제외)
        if (cc == CommunityCategoryCode.LOUNGE && !admin && isPlayerRole(me.getMemberRole())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "스타에게 노출되지 않는 비공개 보드에요. 선수 계정은 접근할 수 없습니다."
            );
        }

        // ✅ 작성자 판정은 "닉네임(boardWriter)" 절대 쓰면 안됨 → memberEmail로 판정
        String writerEmail = (board.getMember() != null) ? board.getMember().getMemberEmail() : null;
        boolean owner = (email != null && writerEmail != null && email.equalsIgnoreCase(writerEmail));

        // TO_T1: 관리자 OR 작성자만 조회 가능
        if (cc == CommunityCategoryCode.TO_T1) {
            if (!admin && !owner) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "매니저 또는 작성자만 열람할 수 있는 비공개 보드에요."
                );
            }
        }

        // secret: 관리자 OR 작성자만
        if (board.isSecret()) {
            if (!admin && !owner) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "비밀글은 본인과 관리자만 조회할 수 있습니다."
                );
            }
        }
    }

    // =========================
    // Comment 수정/삭제 권한
    // =========================

    private void assertCanModifyComment(CommentEntity comment) {
        Authentication auth = currentAuth();
        if (!isLoggedIn(auth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        boolean admin = isAdmin(auth);
        String email = auth.getName();

        // ✅ 작성자 이메일 판정
        String writerEmail = (comment.getMember() != null) ? comment.getMember().getMemberEmail() : null;
        boolean mine = (email != null && writerEmail != null && email.equalsIgnoreCase(writerEmail));

        if (!admin && !mine) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "댓글 수정/삭제 권한이 없습니다.");
        }
    }

    // =========================
    // Create
    // =========================

    @Override
    public CreateCommentRes createComment(CreateCommentReq req) {
        Authentication auth = currentAuth();
        if (!isLoggedIn(auth)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        String loginEmail = auth.getName();

        MemberEntity member = currentMemberOrThrow(loginEmail);

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        // ✅ 게시글 접근 가능해야 댓글 작성 가능
        assertCanAccessBoard(board);

        CommentEntity comment = CommentEntity.builder()
                .board(board)
                .member(member)
                .commentContent(req.getCommentContent())
                .commentLikeCount(0)
                .build();

        CommentEntity saved = commentRepository.save(comment);
        return CreateCommentRes.from(saved);
    }

    // =========================
    // Update
    // =========================

    @Override
    public UpdateCommentRes updateComment(UpdateCommentReq req) {
        CommentEntity comment = commentRepository.findById(req.getCommentNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));

        // ✅ 댓글이 달린 게시글 접근권한 확인(TO_T1/secret/LOUNGE 등)
        if (comment.getBoard() != null) {
            assertCanAccessBoard(comment.getBoard());
        }

        // ✅ 작성자 or 관리자만
        assertCanModifyComment(comment);

        comment.updateContent(req.getCommentContent());
        CommentEntity updated = commentRepository.save(comment);

        return UpdateCommentRes.from(updated);
    }

    // =========================
    // Delete
    // =========================

    @Override
    public DeleteCommentRes deleteComment(DeleteCommentReq req) {
        CommentEntity comment = commentRepository.findById(req.getCommentNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));

        if (comment.getBoard() != null) {
            assertCanAccessBoard(comment.getBoard());
        }

        // ✅ 작성자 or 관리자만
        assertCanModifyComment(comment);

        commentRepository.delete(comment);

        return DeleteCommentRes.builder()
                .commentNo(req.getCommentNo())
                .build();
    }

    // =========================
    // Read
    // =========================

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ReadCommentRes> readComments(ReadCommentReq req) {

        int page = req.getPage();
        int size = req.getSize();

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.max(1, size),
                Sort.by(Sort.Direction.DESC, "commentNo")
        );

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        // ✅ 댓글 목록도 게시글 접근 정책 적용
        assertCanAccessBoard(board);

        Page<CommentEntity> result = commentRepository.findByBoard_BoardNo(req.getBoardNo(), pageable);

        List<ReadCommentRes> dtoList = result.getContent().stream()
                .map(this::toReadCommentRes)
                .toList();

        return PageResponseDTO.<ReadCommentRes>withAll()
                .pageRequestDTO(req)
                .dtoList(dtoList)
                .total((int) result.getTotalElements())
                .build();
    }

    private ReadCommentRes toReadCommentRes(CommentEntity e) {
        return ReadCommentRes.builder()
                .commentNo(e.getCommentNo())
                .boardNo(e.getBoard().getBoardNo())
                .commentWriter(e.getMember().getMemberNickName())
                .memberProfileImageUrl(e.getMember().getMemberImage())
                .commentContent(e.getCommentContent())
                .commentLikeCount(e.getCommentLikeCount())
                .createdAt(e.getCreateDate() != null ? e.getCreateDate().toString() : null)
                .build();
    }
}
