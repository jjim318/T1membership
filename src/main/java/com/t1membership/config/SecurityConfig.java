package com.t1membership.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.t1membership.auth.service.BlacklistServiceImpl;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import jakarta.servlet.http.HttpServletResponse;
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
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
@Log4j2
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtProvider jwtProvider,
            BlacklistServiceImpl blacklistService,
            CorsConfigurationSource corsConfigurationSource,
            MemberRepository memberRepository,
            ObjectMapper objectMapper   // 🔥 에러 JSON 응답용
    ) throws Exception {

        // 1) 세션, CSRF, 기본 인증 비활성화 (JWT + REST)
        http
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable());

        // 2) CORS
        http.cors(c -> c.configurationSource(corsConfigurationSource));

        // 3) 보안 헤더
        http.headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())
                .contentSecurityPolicy(csp ->
                        csp.policyDirectives(
                                "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'self';"
                        ))
        );

        // 4) 인증/인가 실패 시 공통 JSON 응답
        http.exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    log.warn("[Security] 인증 실패 - URI: {}, msg: {}", req.getRequestURI(), ex.getMessage());
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json;charset=UTF-8");
                    Map<String, Object> body = Map.of(
                            "status", HttpServletResponse.SC_UNAUTHORIZED,
                            "message", "인증이 필요합니다."
                    );
                    objectMapper.writeValue(res.getWriter(), body);
                })
                .accessDeniedHandler((req, res, ex) -> {
                    log.warn("[Security] 권한 부족 - URI: {}, msg: {}", req.getRequestURI(), ex.getMessage());
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json;charset=UTF-8");
                    Map<String, Object> body = Map.of(
                            "status", HttpServletResponse.SC_FORBIDDEN,
                            "message", "접근 권한이 없습니다."
                    );
                    objectMapper.writeValue(res.getWriter(), body);
                })
        );

        // 5) URL 별 권한 정책 (👑 순서 중요: 구체적인 것 → 포괄적인 것)
        http.authorizeHttpRequests(auth -> auth
                // Preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // === (1) 완전 공개 엔드포인트 ===
                .requestMatchers(
                        "/auth/login",
                        "/auth/refresh",
                        "/auth/logout",
                        "/member/join",
                        "/member/exists",
                        "/v3/api-docs/**",
                        "/webjars/**",
                        "/main"
                ).permitAll()

                // 🔥 여기 추가
                .requestMatchers(HttpMethod.GET, "/files/**").permitAll()

                // 게시판/아이템/댓글 조회 (GET)
                .requestMatchers(HttpMethod.GET,
                        "/board/**",
                        "/item/**",
                        "/comment"
                ).permitAll()

                // === (2) 로그인한 USER / ADMIN 전용 ===
                // 회원 단건 조회 (마이페이지에서 사용)
                .requestMatchers("/member/readOne")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")

                // 비밀번호 변경
                .requestMatchers("/member/password")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")

                // 프로필 수정 (닉네임 + 이미지)
                .requestMatchers("/member/profile/**")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")

                // 회원 기본 정보 수정 (이름/성별/연락처/주소 등)
                .requestMatchers("/member/modify")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")

                // 마이페이지(기타 하위 경로)
                .requestMatchers("/member/my_page/**")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")

                // 회원 주문 관련 (사용자)
                .requestMatchers("/order/**")
                .hasAnyRole("USER")

                // 장바구니
                .requestMatchers("/cart/**")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT")

                // 댓글 작성/수정/삭제
                .requestMatchers("/comment/**")
                .hasAnyRole("USER", "ADMIN", "ADMIN_CONTENT")

                // 게시글 작성/수정/삭제 (GET은 위에서 permitAll)
                .requestMatchers(HttpMethod.POST, "/board/**")
                .hasAnyRole("USER", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")
                .requestMatchers(HttpMethod.PUT, "/board/**")
                .hasAnyRole("USER", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")
                .requestMatchers(HttpMethod.DELETE, "/board/**")
                .hasAnyRole("USER", "ADMIN_CONTENT","T1","PLAYER_DORAN","PLAYER_ONER",
                        "PLAYER_FAKER","PLAYER_GUMAYUSI","PLAYER_KERIA")

                // Toss 결제 (본인 인증 필수)
                .requestMatchers("/api/pay/toss/**")
                .hasAnyRole("USER")

                // === (3) 관리자 전용 ===
                .requestMatchers("/member/readAll")
                .hasAnyRole("ADMIN", "ADMIN_CONTENT")

                .requestMatchers("/admin/**")
                .hasAnyRole("ADMIN", "ADMIN_CONTENT")

                // 상품 등록/수정/삭제
                .requestMatchers(HttpMethod.POST, "/item")
                .hasAnyRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/item/**")
                .hasAnyRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/item/**")
                .hasAnyRole("ADMIN")

                // === (4) 나머지는 인증만 필요 ===
                .anyRequest().authenticated()
        );

        // 6) JWT 필터 등록
        http.addFilterBefore(
                new JwtAuthenticationFilter(jwtProvider, blacklistService, memberRepository),
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration
    ) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        cfg.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://192.168.0.180:3000"
        ));
        cfg.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        cfg.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
