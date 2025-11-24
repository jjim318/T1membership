package com.t1membership.auth.repository;

import com.t1membership.auth.domain.BlacklistEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface BlacklistRepository extends JpaRepository<BlacklistEntity, Long> {
    // 블랙리스트에 남아있는 해시토큰이 아직 만료되지 않았는지 체크
    boolean existsByAccessTokenHashAndExpiresAtAfter(String accessTokenHash, Instant now);
    // 1) 유효한 access 토큰 해시가 이미 블랙리스트에 있는지 검사
    @Query(value = """
        select case when count(*) > 0 then true else false end
        from access_token_blacklist
        where access_token_hash = :hash
          and expires_at > :now
        """, nativeQuery = true)
    boolean existsValidAccessHash(@Param("hash") String hash,
                                  @Param("now") Instant now);

    // 2) 블랙리스트 insert
    @Modifying
    @Query(value = """
        insert into access_token_blacklist(access_token_hash, expires_at)
        values (:hash, :expiresAt)
        """, nativeQuery = true)
    int insertAccessBlacklist(@Param("hash") String hash,
                              @Param("expiresAt") Instant expiresAt);

    // 만료된 토큰을 주기적으로 삭제
    void deleteByExpiresAtBefore(Instant now);
}
