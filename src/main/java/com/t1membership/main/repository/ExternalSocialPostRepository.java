package com.t1membership.main.repository;

import com.t1membership.main.domain.ExternalSocialPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.zip.ZipFile;

public interface ExternalSocialPostRepository extends JpaRepository<ExternalSocialPost, Long> {
    List<ExternalSocialPost> findTop30ByPlatformOrderByCreateDateDesc(String platform);
}
