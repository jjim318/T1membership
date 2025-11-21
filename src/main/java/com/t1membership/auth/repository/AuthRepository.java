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

public interface AuthRepository extends JpaRepository<AuthEntity,Long> {
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
}
