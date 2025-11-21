package com.t1membership.auth.service;

import com.t1membership.auth.domain.AuthEntity;
import com.t1membership.auth.dto.loginDto.LoginReq;
import com.t1membership.auth.dto.tokenDto.TokenReq;
import com.t1membership.auth.dto.tokenDto.TokenRes;
import com.t1membership.auth.repository.AuthRepository;
import com.t1membership.auth.util.TokenHash;
import com.t1membership.config.JwtProvider;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthRepository authRepository;
    private final JwtProvider jwtProvider;
    private final TokenHash tokenHash;
    private final BlacklistService blacklistService;

    @Override
    @Transactional
    public TokenRes login(LoginReq loginReq){
        //한국시간으로 계산
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

        //로그인 요청 사용자 확인
        final String memberEmail = loginReq.getMemberEmail();

        //db에서 조회
        MemberEntity memberEntity = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 이메일의 회원을 찾을 수 없습니다."));

        //평문 비번과 암호화된 비번 검증
        if (!passwordEncoder.matches(loginReq.getMemberPw(),memberEntity.getMemberPw())){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"비밀번호가 일치하지 않습니다");
        }

        //블랙리스트 체크
        if(authRepository.existsActiveByMemberEmail(memberEntity.getMemberEmail(),now)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"블랙리스트는 로그인을 할 수 없습니다");
        }

        // ==== 🔥 권한 문자열 & roles 리스트 준비 ====
        // DB에 저장된 MemberRole → "USER", "ADMIN" 형태로 뽑아옴
        String role = Optional.ofNullable(memberEntity.getMemberRole())
                .map(Object::toString)                  // Enum -> "USER" / "ADMIN" / ...
                .map(s -> s.startsWith("ROLE_") ? s.substring(5) : s) // "ROLE_USER" → "USER"
                .map(String::toUpperCase)               // 혹시 소문자면 대문자로
                .orElse("USER");                        // 널이면 기본 USER

        // JwtProvider에 넘길 roles 클레임 (["USER"], ["ADMIN"] ...)
        List<String> roles = List.of(role);

        // ==== 🔥 토큰 발급 (roles 포함해서 발급!) ====
        String accessToken = jwtProvider.createAccessToken(memberEmail, roles);
        String refreshToken = jwtProvider.createRefreshToken(memberEmail, roles);

        // 리프레시 토큰 만료 시각
        Instant refreshExp = jwtProvider.getRefreshExpiration(refreshToken);

        // 리프레시 토큰 해시로 변환
        String refreshHash = tokenHash.sha256(refreshToken);

        // 한 멤버당 토큰은 1개만 유지
        int updated = authRepository.upsertRefreshForMember(memberEmail, refreshHash, refreshExp);
        if (updated == 0) {
            AuthEntity authEntity = AuthEntity.builder()
                    .memberEmail(memberEmail)
                    .refreshToken(refreshToken) // 형님 기존 로직 유지 (원래 문자열 저장하던대로)
                    .expiresAt(refreshExp)
                    .revokedAt(null)
                    .build();
            authRepository.save(authEntity);
        }

        // 최종 응답 객체
        return TokenRes.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .memberRole(role)   // "USER" / "ADMIN" 그대로 내려줌
                .build();
    }

    @Override
    public TokenRes refresh(TokenReq tokenReq){
        //클라이언트에서 받은 평문을 해시로 계산
        String hash = tokenHash.sha256(tokenReq.getRefreshToken());
        Instant now = Instant.now();

        //db에서 유효한 리프레시 찾기 : 해시 일치 + 미회수 + 미만료
        AuthEntity authEntity = authRepository.findFirstByRefreshTokenAndRevokedAtIsNullAndExpiresAtAfter(hash,now)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"invalid refresh"));

        //jwt 자체 검증
        Claims claims = jwtProvider.parseClaims(tokenReq.getRefreshToken());

        //jwt로 식별자 구별
        String memberEmail = claims.getSubject();

        //블랙리스트 체크
        LocalDateTime nowKst = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        if (authRepository.existsActiveByMemberEmail(memberEmail,nowKst)){
            //블랙리스트 상태라면 리프레시 갱신 자체를 막음
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"블랙리스트 상태로 갱신이 불가합니다");
        }

        //jwt의 subject와 db에 저장된 memberEmail의 일치여부
        //다르다면 정상적이지 않은 상황이라고 판단
        if (!memberEmail.equals(authEntity.getMemberEmail())){
            //이런경우 리프레시 레코드를 즉시 폐기
            authEntity.setRevokedAt(now);
            authRepository.save(authEntity);

            //예외를 던져 불일치라고 응답
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"가입자와 불일치 합니다");
        }

        //기존 리프레시 토큰은 더 이상 재사용 되지 못 하도록 함
        authEntity.setRevokedAt(now);
        authRepository.save(authEntity);

        //새로운 토큰 발급
        String newAccessToken = jwtProvider.createAccessToken(authEntity.getMemberEmail());
        String newRefreshToken = jwtProvider.createRefreshToken(authEntity.getMemberEmail());

        //새 리프레시 토큰 만료기간
        Instant newRefreshExp = jwtProvider.getRefreshExpiration(newRefreshToken);

        //갱신한 토큰들 저장
        authEntity.setRefreshToken(tokenHash.sha256(newRefreshToken));
        authEntity.setExpiresAt(newRefreshExp);
        authEntity.setRevokedAt(null);
        authRepository.save(authEntity);

        //역활 조회
        String role = memberRepository.findByMemberEmail(memberEmail)
                .map(MemberEntity::getMemberRole)
                .map(Objects::toString)
                .map(s -> s.startsWith("ROLE_") ? s.substring(5) : s)
                .map(String::toUpperCase)
                .orElse("USER");

        //최종 응답
        return TokenRes.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .memberRole(role)
                .build();
    }

    @Override
    @Transactional
    public void logout(TokenReq tokenReq){

        //리프레시 토큰 확인
        String refreshToken = Optional.ofNullable(tokenReq.getRefreshToken())
                .orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"리프레시 토큰이 필요합니다"));

        //리프레시 토큰 검증
        if (!jwtProvider.validateRefreshToken(refreshToken)){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"무효한 리프레시 토큰입니다");
        }

        //현재 시간
        Instant now = Instant.now();

        //해시로 활성한 리프레시 토큰 레코드 조회 (미회수 + 미만료 조건)
        String refreshHash = tokenHash.sha256(refreshToken);
        AuthEntity tok = authRepository.findFirstByRefreshTokenAndRevokedAtIsNullAndExpiresAtAfter(refreshHash,now)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"이미 만료되었거나 회수된 토큰입니다"));

        //subject 교차 검증
        String subject = jwtProvider.getUsernameFlexible(refreshToken);//만료여도 claims가능
        if (!subject.equals(tok.getMemberEmail())){
            //여기에 들어온다는 건 유저의 토큰인데 subject에는 다른유저라고 되어있는 상황
            //바로 해당 리프레시 토큰 레코드 회수(revoked 처리)
            tok.setRevokedAt(now);
            authRepository.save(tok);

            //불일치라고 응답
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"토큰 소유자가 불일치합니다");
        }

        //리프레시 토큰 회수
        tok.setRevokedAt(now);
        authRepository.save(tok);

        //동일 사용자 활성 리프레시 전부 회수
        //로그아웃 시 이 계정의 모든 디바이스에서 같이 로그아웃
        authRepository.revokeAllActiveByMemberId(subject,now);

        //엑세스 토큰 블랙리스트 - 즉시 차단
        String accessToken = tokenReq.getAccessToken();
        if (accessToken != null && !accessToken.isBlank()){
            //토큰을 더 이상 사용할 수 없음을 나타내는 레코드 저장
            blacklistService.addToBlacklist(tokenReq);
        }
    }
}
