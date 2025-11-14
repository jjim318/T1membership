package com.t1membership.order.repository;

import com.t1membership.order.domain.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    // 주문 + 라인 한번에
    @EntityGraph(attributePaths = {"orderItems"})
    Optional<OrderEntity> findByOrderNoAndMember_MemberEmail(Long orderNo, String memberEmail);

    // 목록(요약)용: 상태/기간 필터 등 필요 시 조건 메서드 추가
    Page<OrderEntity> findByMember_MemberEmailOrderByCreatedAtDesc(String memberEmail, Pageable pageable);

    @Query("select o from OrderEntity o join fetch o.member where o.orderNo = :orderNo")
    Optional<OrderEntity> findDetailById(@Param("orderNo") Long orderNo);

    @Query("select o from OrderEntity o left join fetch o.orderItems where o.orderNo = :orderNo")
    Optional<OrderEntity> findByIdFetchItems(@Param("orderNo") Long orderNo);
}
