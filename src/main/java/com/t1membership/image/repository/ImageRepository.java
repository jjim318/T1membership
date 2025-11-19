package com.t1membership.image.repository;

import com.t1membership.image.domain.ImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ImageRepository extends JpaRepository<ImageEntity, UUID> {

    @Query("""
    select i.fileName from ImageEntity i
    where i.item.itemNo = :itemId
    """)
    List<String> getFileName(@Param("itemId")Long itemId);
}

