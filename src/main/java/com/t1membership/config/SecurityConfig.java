package com.t1membership.config;

import com.t1membership.auth.service.BlacklistService;
import com.t1membership.auth.service.BlacklistServiceImpl;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import jakarta.servlet.http.HttpServletResponse;                  // ★추가: 401/403 직접 전송용
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // @PreAuthorize 등 메서드 단위 보안 활성화
@RequiredArgsConstructor
@Log4j2
public class SecurityConfig {

    /**
     * 실무에서 자주 쓰는 스타일:
     * - SecurityFilterChain @Bean 메서드에 필요한 빈들을 파라미터로 DI 받음
     * - JwtAuthenticationFilter에 필요한 의존성도 여기서 주입
     */
    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtProvider jwtProvider,                      // JWT 토큰 파싱/검증기
            BlacklistServiceImpl blacklistService,        // Access Token 블랙리스트 조회
            CorsConfigurationSource corsConfigurationSource,
            MemberRepository memberRepository             // 토큰에서 사용자 로딩 시 참조
    ) throws Exception {

        // ===== 1. 세션, CSRF, 기본 인증 비활성화 (JWT + REST API 기준) =====
        http
                // 세션을 전혀 사용하지 않는 Stateless 모드
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // CSRF 토큰 비활성화 (폼 기반 로그인이 아니고, REST + JWT 구조)
                .csrf(csrf -> csrf.disable())
                // formLogin / httpBasic 모두 사용 안 함
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable());

        // ===== 2. CORS 설정 적용 (허용 Origin/Method/Header 제한) =====
        http.cors(c -> c.configurationSource(corsConfigurationSource));

        // 3) 보안 헤더 (XSS는 CSP + 템플릿 인코딩으로 방어)
        http.headers(headers -> headers
                        // iframe 클릭재킹 방지
                        .frameOptions(frame -> frame.sameOrigin())
                        // Content-Security-Policy: 스크립트/리소스는 자기 도메인만
                        .contentSecurityPolicy(csp ->
                                csp.policyDirectives(
                                        "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'self';"
                                ))
                // HSTS, Referrer-Policy 등은 HTTPS 운영 시 추가 고려
                // .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
        );

        // ===== 4. 인증/인가 실패 시 공통 응답 처리 =====
        http.exceptionHandling(e -> e
                // 인증 실패: JWT 없음/잘못됨 → 401
                .authenticationEntryPoint((req, res, ex) -> {
                    log.warn("[Security] 인증 실패 - URI: {}, msg: {}", req.getRequestURI(), ex.getMessage());
                    res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "인증이 필요합니다.");
                })
                // 인가 실패: 권한 부족 → 403
                .accessDeniedHandler((req, res, ex) -> {
                    log.warn("[Security] 권한 부족 - URI: {}, msg: {}", req.getRequestURI(), ex.getMessage());
                    res.sendError(HttpServletResponse.SC_FORBIDDEN, "접근 권한이 없습니다.");
                })
        );

        // ===== 5. URL 별 권한 정책 (Least Privilege 원칙) =====
        http.authorizeHttpRequests(auth -> auth
                // Preflight (CORS 옵션 요청) 모두 허용
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // === (1) 완전 공개 엔드포인트 ===
                .requestMatchers(
                        "/auth/login",
                        "/auth/refresh",
                        "/auth/logout",
                        "/member/join",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/swagger-resources/**",
                        "/webjars/**",
                        "/member/exists"
                ).permitAll()

                // 게시판/아이템/댓글 조회는 누구나 (GET만)
                .requestMatchers(HttpMethod.GET,
                        "/board/**",
                        "/item/**",
                        "/comment"
                ).permitAll()

                // === (2) 로그인한 USER 이상만 ===
                // 마이페이지, 회원 정보 수정  → 로그인한 회원 (USER/ADMIN) 모두 가능
                .requestMatchers("/member/my_page/**", "/member/modify","/member/profile").hasAnyRole("USER", "ADMIN")

                // 회원 목록/단건 조회
                .requestMatchers("/member/readAll").hasRole("ADMIN")              // 전체 목록은 관리자만
                .requestMatchers("/member/readOne").hasAnyRole("USER", "ADMIN")   // 단건 조회는 회원+관리자

                // 장바구니
                .requestMatchers("/cart/**").hasRole("USER")

                // 회원 주문 (생성/조회/취소)
                .requestMatchers("/order/**").hasRole("USER")

                // 댓글 작성/수정/삭제
                .requestMatchers("/comment/**").hasRole("USER")

                // 게시글 작성/수정/삭제 (GET은 위에서 permitAll)
                .requestMatchers(HttpMethod.POST, "/board/**").hasRole("USER")
                .requestMatchers(HttpMethod.PUT, "/board/**").hasRole("USER")
                .requestMatchers(HttpMethod.DELETE, "/board/**").hasRole("USER")

                // Toss 결제 (본인 인증 필수)
                .requestMatchers("/api/pay/toss/**").hasRole("USER")

                // === (3) 관리자 전용 ===
                // 전체 관리자 URL (향후 /admin/** 확장 대비)
                .requestMatchers("/admin/**").hasRole("ADMIN")

                // 상품 등록/수정/삭제
                .requestMatchers(HttpMethod.POST, "/item").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/item/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/item/**").hasRole("ADMIN")

                // === (4) 그 외 모든 요청은 '인증'만 필요 (권한은 추가로 메서드 단위에서 제한 가능) ===
                .anyRequest().authenticated()
        );

        // ===== 6. JWT 인증 필터 체인 앞에 등록 =====
        http.addFilterBefore(
                new JwtAuthenticationFilter(jwtProvider, blacklistService, memberRepository),
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }

    // === AuthenticationManager: 로그인 시 UsernamePasswordAuthenticationToken 인증에 사용 ===
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration
    ) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    // === 비밀번호 암호화 (BCrypt - 실무 기본 선택) ===
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // === CORS 설정: 허용 Origin/Method/Header 명시 ===
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        // 개발/로컬 프론트엔드 Origin (운영 시 실제 도메인만 남기고 정리 필요)
        cfg.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://localhost:3001"
        ));

        // 허용 메서드
        cfg.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // 허용 헤더 (Authorization 포함)
        cfg.setAllowedHeaders(List.of("*"));

        // 자격증명 허용 (쿠키/Authorization 헤더 등)
        cfg.setAllowCredentials(true);

        // 프론트에서 읽을 수 있는 응답 헤더
        cfg.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
