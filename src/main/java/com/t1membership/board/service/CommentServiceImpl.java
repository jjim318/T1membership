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
import com.t1membership.member.reporitory.MemberRepository;
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

        CommentEntity comment = CommentEntity.builder()
                .board(board)
                .member(member)
                .commentContent(req.getCommentContent())
                .commentLikeCount(req.getCommentLikeCount())
                .build();

        CommentEntity saved = commentRepository.save(comment);

        return CreateCommentRes.from(saved);
    }

    @Override
    public UpdateCommentRes updateComment(UpdateCommentReq req) {

        CommentEntity comment = commentRepository.findById(req.getCommentNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));

        comment.updateContent(req.getCommentContent());   // 🔥 엔티티 메서드 사용

        CommentEntity updated = commentRepository.save(comment);

        return UpdateCommentRes.from(updated);            // 🔥 DTO의 from() 사용
    }

    @Override
    public DeleteCommentRes deleteComment(DeleteCommentReq req) {

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

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "commentNo"));

        var result = commentRepository.findByBoard_BoardNo(req.getBoardNo(), pageable);

        List<ReadCommentRes> dtoList = result.getContent().stream()
                .map(this::toReadCommentRes)
                .toList();

        return PageResponseDTO.<ReadCommentRes>builder()
                .dtoList(dtoList)
                .page(page)
                .size(size)
                .total((int) result.getTotalElements())
                .build();
    }

    private ReadCommentRes toReadCommentRes(CommentEntity entity) {
        return ReadCommentRes.builder()
                .commentNo(entity.getCommentNo())
                .boardNo(entity.getBoard().getBoardNo())
                .commentWriter(entity.getMember().getMemberNickName())
                .commentContent(entity.getCommentContent())
                .commentLikeCount(entity.getCommentLikeCount())
                .build();
    }
}

