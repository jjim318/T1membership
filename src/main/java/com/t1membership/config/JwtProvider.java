package com.t1membership.config;

import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class JwtProvider {

    // ==========================
    // 의존성
    // ==========================
    private final MemberRepository memberRepository;

    public JwtProvider(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    // ==========================
    // Secrets (환경변수/설정 주입)
    // ==========================
    @Value("${jwt.access-secret}")
    private String accessSecret;     // Access 서명 키(최소 32바이트 권장: 256bit)

    @Value("${jwt.refresh-secret}")
    private String refreshSecret;    // Refresh 서명 키(Access와 반드시 다르게)

    // ==========================
    // Keys (서명 키 객체)
    // ==========================
    private Key accessKey() {
        return Keys.hmacShaKeyFor(accessSecret.getBytes(StandardCharsets.UTF_8));
    }

    private Key refreshKey() {
        return Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8));
    }

    // ==========================
    // Expiry (유효기간)
    // ==========================
    private final long accessTokenValidity  = 1000L * 60 * 15;      // Access: 15분
    private final long refreshTokenValidity = 1000L * 60 * 60 * 24; // Refresh: 1일

    // =========================================================
    // Create Tokens (발급)
    // =========================================================

    /**
     * Access 토큰 발급 (권한 포함)
     * - memberEmail: 보통 이메일 (memberEmail)
     * - roles: ["USER"], ["ADMIN"], ["ADMIN_CONTENT"] 등 MemberRole.name() 목록
     */
    public String createAccessToken(String memberEmail, Collection<String> roles) {
        return Jwts.builder()
                .setSubject(memberEmail)
                .claim("roles", roles)     // 🔥 roles claim
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessTokenValidity))
                .signWith(accessKey())
                .compact();
    }

    /**
     * ⚡ 이메일만 주어졌을 때 — DB에서 역할을 읽어서 자동으로 roles claim에 넣어주는 버전
     * 로그인 로직에서 이 메서드를 써도 roles 가 항상 JWT에 실리도록 처리.
     */
    public String createAccessToken(String memberEmail) {
        MemberEntity member = memberRepository.findById(memberEmail)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다: " + memberEmail));

        List<String> roles = new ArrayList<>();

        // 🔥 단일 enum 구조라고 가정 (MemberRole memberRole)
        if (member.getMemberRole() != null) {
            roles.add(member.getMemberRole().name());   // 예: ADMIN_CONTENT
        }

        // 만약 추후에 리스트로 바꾸면 이렇게:
        // member.getMemberRoleList().forEach(r -> roles.add(r.name()));

        return createAccessToken(memberEmail, roles);
    }

    /**
     * Refresh 토큰 발급 (권한 포함)
     * - 재발급 시에도 동일 roles를 싣고 싶으면 사용
     */
    public String createRefreshToken(String memberEmail, Collection<String> roles) {
        return Jwts.builder()
                .setSubject(memberEmail)
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + refreshTokenValidity))
                .signWith(refreshKey())
                .compact();
    }

    /**
     * ⚡ 이메일만 주어졌을 때 — Access와 동일하게 DB에서 roles를 읽어서 claim에 포함
     * (원하면 Refresh에는 roles 안 넣고 싶을 수도 있으니, 필요 없으면 이 메서드는 안 써도 됨)
     */
    public String createRefreshToken(String memberEmail) {
        MemberEntity member = memberRepository.findById(memberEmail)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다: " + memberEmail));

        List<String> roles = new ArrayList<>();
        if (member.getMemberRole() != null) {
            roles.add(member.getMemberRole().name());
        }

        return createRefreshToken(memberEmail, roles);
    }

    // =========================================================
    // Validation (검증)
    // =========================================================

    /** Access 토큰 유효성(서명/만료) 검증 — 인증 필터에서 사용 */
    public boolean validateAccessToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(accessKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Refresh 토큰 유효성(서명/만료) 검증 — /auth/refresh 에서만 사용 */
    public boolean validateRefreshToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(refreshKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // ===================================================================================
    // Parsing (보조용)
    // ===================================================================================

    public Claims parseClaimsFlexible(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(accessKey()).build()
                    .parseClaimsJws(token).getBody();
        } catch (ExpiredJwtException e) {
            return e.getClaims(); // Access 만료여도 Claims 반환
        } catch (JwtException e) {
            try {
                return Jwts.parserBuilder().setSigningKey(refreshKey()).build()
                        .parseClaimsJws(token).getBody();
            } catch (ExpiredJwtException ex) {
                return ex.getClaims(); // Refresh 만료여도 Claims 반환
            }
        }
    }

    // =========================================================
    // Subject/Expiration 유틸
    // =========================================================

    /** 인증용 subject 추출 — Access 키로만 파싱(Refresh는 허용 X) */
    public String getUsernameForAccess(String token) {
        return Jwts.parserBuilder().setSigningKey(accessKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    /** 범용 subject 추출 — 로깅/블랙리스트 용 */
    public String getUsernameFlexible(String token) {
        return parseClaimsFlexible(token).getSubject();
    }

    /** Refresh 토큰 만료 시간 읽기 */
    public Instant getRefreshExpiration(String refreshToken) {
        Claims c = Jwts.parserBuilder().setSigningKey(refreshKey()).build()
                .parseClaimsJws(refreshToken).getBody();
        return c.getExpiration().toInstant();
    }

    // =========================================================
    // Authentication (SecurityContext용) — Access 전용
    // =========================================================

    public Authentication getAuthentication(String accessToken) {
        Claims claims = Jwts.parserBuilder().setSigningKey(accessKey()).build()
                .parseClaimsJws(accessToken).getBody();

        String memberId = claims.getSubject();
        Collection<? extends GrantedAuthority> authorities =
                toAuthorities(extractRoles(claims));   // ← roles 클레임을 권한으로 변환

        UserDetails user = User.withUsername(memberId)
                .password("") // 비밀번호는 여기서 안 씀
                .authorities(authorities)
                .build();

        return new UsernamePasswordAuthenticationToken(user, "", user.getAuthorities());
    }

    // =========================================================
    // 내부 유틸: roles 추출/권한 매핑
    // =========================================================

    @SuppressWarnings("unchecked")
    private List<String> extractRoles(Claims claims) {
        Object raw = claims.get("roles");
        if (raw == null) return List.of();

        if (raw instanceof Collection<?> col) {
            return col.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .collect(Collectors.toList());
        }
        // 단일 문자열로 오는 경우 대비
        return List.of(String.valueOf(raw));
    }

    private Collection<? extends GrantedAuthority> toAuthorities(Collection<String> roles) {
        if (roles == null || roles.isEmpty()) return List.of();
        return roles.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(r -> !r.isEmpty())
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r) // USER → ROLE_USER
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toUnmodifiableList());
    }

    // =========================================================
    // 기존 코드 호환용 (원하면 지워도 됨)
    // =========================================================

    /** @deprecated 새 코드에서는 createAccessToken(memberId, roles)를 사용 */
    @Deprecated
    public String createToken(String memberId, Collection<String> roles) {
        return createAccessToken(memberId, roles);
    }

    /** @deprecated 인증 필터에서는 validateAccessToken(...)만 쓰는 걸 권장 */
    @Deprecated
    public boolean validateToken(String token) {
        return validateAccessToken(token) || validateRefreshToken(token);
    }

    /** @deprecated 인증에서는 getUsernameForAccess(...)를 사용 */
    @Deprecated
    public String getUsername(String token) {
        return getUsernameForAccess(token);
    }

    /** @deprecated parseClaimsFlexible(...) 사용 권장 */
    @Deprecated
    public Claims parseClaims(String token) {
        return parseClaimsFlexible(token);
    }
}
