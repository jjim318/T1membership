package com.t1membership.board.repository;

import com.t1membership.board.constant.BoardType;
import com.t1membership.board.domain.BoardEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BoardRepository extends JpaRepository<BoardEntity, Long> {

    @Query("""
        select b
          from BoardEntity b
         where (:type is null or b.boardType = :type)
    """)
    Page<BoardEntity> searchByType(
            @Param("type") BoardType type,
            Pageable pageable
    );

    List<BoardEntity>
    findByBoardTypeAndMainBannerIsTrueOrderByBannerOrderAscBoardNoDesc(BoardType boardType);

    List<BoardEntity> findTop6ByBoardTypeOrderByCreateDateDesc(BoardType boardType);
}
