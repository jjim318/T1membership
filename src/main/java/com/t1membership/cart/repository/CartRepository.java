package com.t1membership.cart.repository;

import com.t1membership.cart.domain.CartEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<CartEntity, Long> {
    // 멤버의 장바구니 중 특정 itemNos만
    List<CartEntity> findAllByMember_MemberEmailAndItem_ItemNoIn(String memberEmail, List<Long> itemNos);

    // 멤버 장바구니 전체 조회(화면 리스트용)
    List<CartEntity> findAllByMember_MemberEmailOrderByCartNoDesc(String memberEmail);

    // 멤버+아이템 단건 (담기/증가에 사용)
    Optional<CartEntity> findByMember_MemberEmailAndItem_ItemNo(String memberEmail, Long itemNo);

    // 선택 라인 제거(주문 완료 후 사용)
    void deleteByMember_MemberEmailAndItem_ItemNoIn(String memberEmail, List<Long> itemNos);

    @Query("""
      select c from CartEntity c
        join fetch c.item i
        join c.member m
       where m.memberEmail = :memberEmail
         and i.itemNo in :itemNos
       order by c.cartNo desc
    """)
    List<CartEntity> findLinesForPrepare(
            @Param("memberEmail") String memberEmail,
            @Param("itemNos") List<Long> itemNos
    );
}
