package com.t1membership.board.repository;

import com.t1membership.board.domain.CommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {

    Page<CommentEntity> findByBoard_BoardNo(Long boardNo, Pageable pageable);

    // 필요하면: 특정 게시글 + 댓글번호 함께 조회도 가능
    // Optional<CommentEntity> findByCommentNoAndBoard_BoardNo(Long commentNo, Long boardNo);

}
