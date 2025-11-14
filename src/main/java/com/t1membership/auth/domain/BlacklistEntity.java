package com.t1membership.auth.domain;

import com.t1membership.coreDomain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "member_blacklist")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BlacklistEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long blacklistId;

    @Column(name = "member_email", nullable = false)
    private String memberEmail;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "created_by_admin")
    private String createdByAdmin;

    @Column(name = "access_token", nullable = false)
    private String accessTokenHash; // 해싱된 access토큰

    @Column(name = "access_expiresAt",nullable = false)
    private Instant expiresAt;      // 만료시간
}
