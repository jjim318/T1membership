package com.t1membership.auth.domain;

import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "t1_auth" , uniqueConstraints = {
@UniqueConstraint(name = "uk_token_member", columnNames = "member_email")
        })//@UniqueConstraint("member_id")로 1:1 제약을 보장
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "token_no", nullable = false)
    private Long tokenNo;

    @Column(name = "member_email", nullable = false)
    private String memberEmail;

    @Column(name = "refresh_token", nullable = false)
    private String refreshToken;

    @Column(name = "token_expiresAt")
    private Instant expiresAt;//만료시각 얘만 있으면 자동 만료밖에 못 함

    @Column(name = "token_revokedAt")
    private Instant revokedAt;// null이면 유효, 값이 있으면 무효화 시각

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_email", nullable = false, referencedColumnName = "member_email", insertable = false, updatable = false)
    private MemberEntity member;
}
