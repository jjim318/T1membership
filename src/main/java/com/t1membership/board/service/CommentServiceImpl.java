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

    /**
     * ✅ 중요: 형님 프로젝트는 "권한"이 authorities로도 올 수 있고,
     * MemberEntity.memberRole(enum/string) 로도 판단하는 흐름이 섞여있습니다.
     *
     * - 수정/삭제 권한은 "관리자" 판정을 정확히 해야 하니
     *   authorities + memberRole 둘 다 커버합니다.
     */
    private boolean isAdmin(Authentication auth, MemberEntity me) {
        boolean byAuthorities = false;
        if (auth != null) {
            byAuthorities = auth.getAuthorities().stream().anyMatch(a ->
                    "ROLE_ADMIN".equals(a.getAuthority())
                            || "ROLE_MANAGER".equals(a.getAuthority())
                            || "ADMIN".equals(a.getAuthority())
                            || "MANAGER".equals(a.getAuthority())
            );
        }

        boolean byMemberRole = false;
        if (me != null && me.getMemberRole() != null) {
            String role = me.getMemberRole().toString();
            byMemberRole = "ADMIN".equals(role) || "ADMIN_CONTENT".equals(role) || "T1".equals(role);
        }

        return byAuthorities || byMemberRole;
    }

    private MemberEntity currentMemberOrThrow(String email) {
        return memberRepository.findById(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보를 찾을 수 없습니다."));
    }

    private boolean isPlayerRole(Object role) {
        return role != null && role.toString().startsWith("PLAYER");
    }

    private boolean isMembershipActive(MemberEntity me) {
        try {
            Object payType = me.getMembershipType(); // 형님 엔티티 getter 이름 그대로 사용
            if (payType == null) return false;
            return !"NO_MEMBERSHIP".equalsIgnoreCase(payType.toString());
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isStoryPrivilege(MemberEntity me, boolean admin) {
        return admin || isPlayerRole(me.getMemberRole()) || isMembershipActive(me);
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
        String email = loggedIn ? auth.getName() : null;

        if (!loggedIn) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        MemberEntity me = currentMemberOrThrow(email);
        boolean admin = isAdmin(auth, me);

        // STORY
        if (board.getBoardType() == BoardType.STORY) {
            if (board.isSecret()) {
                if (!isStoryPrivilege(me, admin)) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "멤버십 회원 전용 콘텐츠라 댓글을 작성/조회할 수 없습니다."
                    );
                }
            }
            return;
        }

        // COMMUNITY 외 타입은 로그인만
        if (board.getBoardType() != BoardType.COMMUNITY) {
            return;
        }

        boolean membershipPrivilege =
                admin
                        || isPlayerRole(me.getMemberRole())
                        || isMembershipActive(me);

        if (!membershipPrivilege) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "멤버십 회원에게 공개된 페이지예요.");
        }

        String ccRaw = board.getCategoryCode();
        validateCommunityCategoryOrThrow(ccRaw);
        CommunityCategoryCode cc = CommunityCategoryCode.valueOf(ccRaw.trim().toUpperCase());

        if (cc == CommunityCategoryCode.LOUNGE && !admin && isPlayerRole(me.getMemberRole())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "스타에게 노출되지 않는 비공개 보드에요. 선수 계정은 접근할 수 없습니다."
            );
        }

        String writerEmail = (board.getMember() != null) ? board.getMember().getMemberEmail() : null;
        boolean owner = (email != null && writerEmail != null && email.equalsIgnoreCase(writerEmail));

        if (cc == CommunityCategoryCode.TO_T1) {
            if (!admin && !owner) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "매니저 또는 작성자만 열람할 수 있는 비공개 보드에요."
                );
            }
        }

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

        String email = auth.getName();
        MemberEntity me = currentMemberOrThrow(email);
        boolean admin = isAdmin(auth, me);

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

        if (comment.getBoard() != null) {
            assertCanAccessBoard(comment.getBoard());
        }

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

        assertCanAccessBoard(board);

        // ✅ 로그인 정보 (isMine 계산용)
        Authentication auth = currentAuth();
        String loginEmail = (isLoggedIn(auth) ? auth.getName() : null);

        Page<CommentEntity> result = commentRepository.findByBoard_BoardNo(req.getBoardNo(), pageable);

        List<ReadCommentRes> dtoList = result.getContent().stream()
                .map(e -> toReadCommentRes(e, loginEmail))
                .toList();

        return PageResponseDTO.<ReadCommentRes>withAll()
                .pageRequestDTO(req)
                .dtoList(dtoList)
                .total((int) result.getTotalElements())
                .build();
    }

    // ✅ 변경: loginEmail을 받아 isMine 계산
    private ReadCommentRes toReadCommentRes(CommentEntity e, String loginEmail) {
        String writerEmail = (e.getMember() != null) ? e.getMember().getMemberEmail() : null;
        boolean mine = (loginEmail != null && writerEmail != null && loginEmail.equalsIgnoreCase(writerEmail));

        return ReadCommentRes.builder()
                .commentNo(e.getCommentNo())
                .boardNo(e.getBoard().getBoardNo())
                .commentWriter(e.getMember().getMemberNickName())
                .memberProfileImageUrl(e.getMember().getMemberImage())
                .commentContent(e.getCommentContent())
                .commentLikeCount(e.getCommentLikeCount())
                .createdAt(e.getCreateDate() != null ? e.getCreateDate().toString() : null)
                .mine(mine) // ✅ 여기
                .build();
    }
}
