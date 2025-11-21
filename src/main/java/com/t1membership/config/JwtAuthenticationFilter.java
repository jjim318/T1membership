package com.t1membership.config;

import com.t1membership.auth.dto.tokenDto.TokenReq;
import com.t1membership.auth.service.BlacklistServiceImpl;
import com.t1membership.member.constant.MemberRole;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final BlacklistServiceImpl blacklistService;
    private final MemberRepository memberRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        String header = request.getHeader("Authorization");
        log.info("\n========== [JWT FILTER START] uri={} ==========", uri);
        log.info("[JWT] header={}", header);

        // 1) Authorization 없으면 그냥 익명으로 넘김
        if (header == null || !header.startsWith("Bearer ")) {
            log.info("[JWT] 헤더 없음 or Bearer 아님 → 익명으로 통과");
            chain.doFilter(request, response);
            log.info("========== [JWT FILTER END - ANONYMOUS] ==========\n");
            return;
        }

        String access = header.substring(7);
        log.info("[JWT] accessToken={}", access);

        try {
            // 2) 블랙리스트 체크
            TokenReq tokenRequest = TokenReq.builder()
                    .accessToken(access)
                    .build();

            log.info("[JWT] 블랙리스트 체크 시작");
            boolean blacklisted = blacklistService.isBlacklisted(tokenRequest);
            log.info("[JWT] 블랙리스트 체크 결과 = {}", blacklisted);

            if (blacklisted) {
                log.warn("[JWT] 블랙리스트 토큰 → 401");
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token is revoked");
                return;
            }

            // 3) 토큰 유효성 검사
            boolean valid = jwtProvider.validateAccessToken(access);
            log.info("[JWT] validateAccessToken(access)={}", valid);

            if (!valid) {
                log.warn("[JWT] 유효하지 않은 토큰 → 인증 없음");
                chain.doFilter(request, response);
                log.info("========== [JWT FILTER END - INVALID TOKEN] ==========\n");
                return;
            }

            // 4) SecurityContext 비어 있을 때만 세팅
            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                String memberEmail = jwtProvider.getUsernameForAccess(access);
                log.info("[JWT] subject(memberEmail)={}", memberEmail);

                MemberRole status = memberRepository.findByMemberEmail(memberEmail)
                        .map(MemberEntity::getMemberRole)
                        .orElse(MemberRole.USER); // 없으면 USER 취급 (dev용 완화)

                log.info("[JWT] DB MemberRole={}", status);

                if (status == MemberRole.BLACKLIST) {
                    log.warn("[JWT] BLACKLIST 사용자 → 403");
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "User is blacklisted");
                    return;
                }

                Authentication authentication = jwtProvider.getAuthentication(access);
                log.info("[JWT] authentication={}", authentication);

                if (authentication == null) {
                    log.warn("[JWT] authentication=null → 인증 세팅 안 함");
                } else {
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.info("[JWT] SecurityContext 에 인증 세팅 완료");
                }
            } else {
                log.info("[JWT] SecurityContext 에 이미 인증 존재 → 기존 것 사용");
            }

            chain.doFilter(request, response);
            log.info("========== [JWT FILTER END - SUCCESS] ==========\n");

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.warn("[JWT] 만료 토큰 예외 발생", e);
            chain.doFilter(request, response);
            log.info("========== [JWT FILTER END - EXPIRED] ==========\n");

        } catch (Exception e) {
            log.error("[JWT] 필터 처리 중 예외 발생", e);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
            log.info("========== [JWT FILTER END - ERROR] ==========\n");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        boolean skip = uri.startsWith("/auth/");
        log.debug("[JWT] shouldNotFilter uri={} skip={}", uri, skip);
        return skip;
    }
}
