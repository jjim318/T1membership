package com.t1membership.item.repository;

import com.t1membership.item.domain.ItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, Long> {
    // 나중에 커스텀 조건 붙이고 싶으면 이런 것도 가능:
    // Page<ItemEntity> findAllByItemCategory(ItemCategory category, Pageable pageable);
}
