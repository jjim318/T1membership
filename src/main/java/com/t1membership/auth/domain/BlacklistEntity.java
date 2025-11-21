package com.t1membership.auth.domain;

import com.t1membership.coreDomain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "access_token_blacklist") // ★ DB 테이블 이름
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BlacklistEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "blacklist_id")
    private Long blacklistId;

    // 어떤 회원의 토큰인지 (필요 없으면 nullable = true 로 바꿔도 됨)
    @Column(name = "member_email", nullable = false)
    private String memberEmail;

    // 블랙리스트 사유
    @Column(name = "reason", length = 500)
    private String reason;

    // 언제까지 블랙리스트로 둘 건지 (옵션)
    @Column(name = "end_at")
    private LocalDateTime endAt;

    // 언제 해제했는지 (옵션)
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    // 누가 만들었는지 (관리자 이메일 등)
    @Column(name = "created_by_admin")
    private String createdByAdmin;

    // 해싱된 access 토큰
    @Column(name = "access_token_hash", nullable = false, length = 255)
    private String accessTokenHash;

    // 해당 토큰의 만료 시간 (만료 이후엔 정리용)
    @Column(name = "access_expires_at", nullable = false)
    private Instant expiresAt;
}
