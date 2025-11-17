package com.t1membership.item.repository;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.Player;
import com.t1membership.item.domain.ItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, Long> {
    // 나중에 커스텀 조건 붙이고 싶으면 이런 것도 가능:
    // Page<ItemEntity> findAllByItemCategory(ItemCategory category, Pageable pageable);

    // 멤버십 상품만 (활성된 것만)
    List<ItemEntity> findByItemCategoryAndMembershipActiveIsTrue(ItemCategory itemCategory);

    // 페이지네이션까지 쓰고 싶으면
    Page<ItemEntity> findByItemCategoryAndMembershipActiveIsTrue(
            ItemCategory itemCategory,
            Pageable pageable
    );

    // POP 전체 (예: 'POP 리스트 탭' 같은 데서)
    List<ItemEntity> findByItemCategory(ItemCategory itemCategory);

    // 선수별 POP
    List<ItemEntity> findByItemCategoryAndPopPlayer(
            ItemCategory itemCategory,
            Player popPlayer
    );

    // ItemRepository
    Page<ItemEntity> findAllByItemCategory(ItemCategory itemCategory, Pageable pageable);


}
