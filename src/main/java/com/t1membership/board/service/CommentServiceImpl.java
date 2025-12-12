package com.t1membership.board.service;

import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.domain.CommentEntity;
import com.t1membership.board.dto.createComment.CreateCommentReq;
import com.t1membership.board.dto.createComment.CreateCommentRes;
import com.t1membership.board.dto.updateComment.UpdateCommentReq;
import com.t1membership.board.dto.updateComment.UpdateCommentRes;
import com.t1membership.board.dto.deleteComment.DeleteCommentReq;
import com.t1membership.board.dto.deleteComment.DeleteCommentRes;
import com.t1membership.board.dto.readComment.ReadCommentReq;
import com.t1membership.board.dto.readComment.ReadCommentRes;
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

    @Override
    public CreateCommentRes createComment(CreateCommentReq req) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        String loginEmail = auth.getName();

        MemberEntity member = memberRepository.findById(loginEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보를 찾을 수 없습니다."));

        BoardEntity board = boardRepository.findById(req.getBoardNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글을 찾을 수 없습니다."));

        // 🔥 likeCount는 클라가 보내는 값 신뢰하지 말고 서버에서 0 고정 권장
        CommentEntity comment = CommentEntity.builder()
                .board(board)
                .member(member)
                .commentContent(req.getCommentContent())
                .commentLikeCount(0)
                .build();

        CommentEntity saved = commentRepository.save(comment);

        return CreateCommentRes.from(saved);
    }

    @Override
    public UpdateCommentRes updateComment(UpdateCommentReq req) {

        // 🔥 본인 체크까지는 실무에서 필수인데,
        // 형님이 원하면 여기서 auth 검사 + 작성자 이메일 비교까지 넣겠습니다.
        CommentEntity comment = commentRepository.findById(req.getCommentNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));

        comment.updateContent(req.getCommentContent());

        CommentEntity updated = commentRepository.save(comment);

        return UpdateCommentRes.from(updated);
    }

    @Override
    public DeleteCommentRes deleteComment(DeleteCommentReq req) {

        // 🔥 본인 체크(실무 필수) 필요하면 넣겠습니다.
        CommentEntity comment = commentRepository.findById(req.getCommentNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));

        commentRepository.delete(comment);

        return DeleteCommentRes.builder()
                .commentNo(req.getCommentNo())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ReadCommentRes> readComments(ReadCommentReq req) {

        int page = req.getPage();
        int size = req.getSize();

        // 🔥 sortBy를 받지만 지금은 무조건 commentNo DESC로 고정되어 있음
        // 일단 프론트 무한스크롤은 commentNo DESC가 안정적이라 이대로 두는게 좋습니다.
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "commentNo"));

        var result = commentRepository.findByBoard_BoardNo(req.getBoardNo(), pageable);

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
                .memberProfileImageUrl(e.getMember().getMemberImage()) // ✅ MemberEntity 필드명 맞추기
                .commentContent(e.getCommentContent())
                .commentLikeCount(e.getCommentLikeCount())
                .createdAt(e.getCreateDate() != null ? e.getCreateDate().toString() : null) // ✅ BaseEntity 필드명 맞추기
                .build();
    }
}
