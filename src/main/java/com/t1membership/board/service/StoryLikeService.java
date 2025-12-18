package com.t1membership.board.service;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import com.t1membership.board.domain.BoardLikeEntity;
import com.t1membership.board.dto.story.ToggleStoryLikeRes;
import com.t1membership.board.repository.BoardLikeRepository;
import com.t1membership.board.repository.BoardRepository;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StoryLikeService {

    private final BoardRepository boardRepository;
    private final BoardLikeRepository boardLikeRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public ToggleStoryLikeRes toggleLike(Long boardNo, String email) {

        MemberEntity member = memberRepository.findByMemberEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        BoardEntity board = boardRepository.findById(boardNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (board.getBoardType() != BoardType.STORY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        boolean liked;

        var existing =
                boardLikeRepository.findByBoard_BoardNoAndMember_MemberEmail(boardNo, email);

        if (existing.isPresent()) {
            boardLikeRepository.delete(existing.get());
            board.setBoardLikeCount(board.getBoardLikeCount() - 1);
            liked = false;
        } else {
            boardLikeRepository.save(
                    BoardLikeEntity.builder()
                            .board(board)
                            .member(member)
                            .build()
            );
            board.setBoardLikeCount(board.getBoardLikeCount() + 1);
            liked = true;
        }

        return ToggleStoryLikeRes.builder()
                .boardNo(boardNo)
                .liked(liked)
                .likeCount(board.getBoardLikeCount())
                .build();
    }
}

