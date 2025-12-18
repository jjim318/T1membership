package com.t1membership.board.repository;

import com.t1membership.board.domain.BoardLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BoardLikeRepository extends JpaRepository<BoardLikeEntity, Long> {

    boolean existsByBoard_BoardNoAndMember_MemberEmail(Long boardNo, String email);

    Optional<BoardLikeEntity> findByBoard_BoardNoAndMember_MemberEmail(Long boardNo, String email);

    long countByBoard_BoardNo(Long boardNo);
}
