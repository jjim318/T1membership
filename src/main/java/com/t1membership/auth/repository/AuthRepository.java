package com.t1membership.auth.repository;

import com.t1membership.auth.domain.AuthEntity;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthRepository extends JpaRepository<AuthEntity,String> {
    @Query("""
    select case when count(b) > 0 then true else false end
    from BlacklistEntity b
    where b.memberEmail = :email
      and b.createDate <= :now
      and (b.endAt is null or b.endAt >= :now)
      and b.revokedAt is null
""")
    boolean existsActiveByMemberEmail(@Param("email") String email,
                                      @Param("now") LocalDateTime now);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
  update AuthEntity t
     set t.refreshToken = :refresh,
         t.expiresAt   = :expiresAt,
         t.revokedAt   = null
   where t.memberEmail    = :memberEmail
""")
    int upsertRefreshForMember(@Param("memberEmail") String memberEmail,
                               @Param("refresh") String refresh,
                               @Param("expiresAt") Instant expiresAt);


    @Modifying
    @Transactional
    @Query("""
        update AuthEntity t
           set t.revokedAt = :now
         where t.memberEmail = :memberEmail
           and t.revokedAt is null
           and t.expiresAt > :now
    """)
    int revokeAllActiveByMemberId(@Param("memberEamil") String memberEamil,
                                  @Param("now") Instant now);

    Optional<AuthEntity> findFirstByRefreshTokenAndRevokedAtIsNullAndExpiresAtAfter(
            String refreshToken, Instant now);

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
