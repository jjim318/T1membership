package com.t1membership.auth.controller;

import com.t1membership.auth.dto.loginDto.LoginReq;
import com.t1membership.auth.dto.tokenDto.TokenReq;
import com.t1membership.auth.dto.tokenDto.TokenRes;
import com.t1membership.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<TokenRes> login(@RequestBody LoginReq loginReq) {
        return ResponseEntity.ok(authService.login(loginReq));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRes> refresh(@RequestBody TokenReq tokenReq) {
        return ResponseEntity.ok(authService.refresh(tokenReq));
    }

    @PostMapping("/logout")
    public ResponseEntity<TokenRes> logout(@RequestHeader(value = "AuthorIzation",required = false) String authorization,
    @RequestBody TokenReq tokenReq) {
        String access = clean(authorization);
        String refresh = clean(tokenReq.getRefreshToken());

        TokenReq req = TokenReq.builder()
                .accessToken(access)
                .refreshToken(refresh)
                .build();

        authService.logout(req);
        return ResponseEntity.noContent().build();
    }

    private String clean(String token) {
        if (token == null) return null;
        token = token.trim();
        if (token.isBlank()) return null;
        if (token.toLowerCase().startsWith("bearer ")) {
            return token.substring(7).trim();
        }
        return token;
    }
}
