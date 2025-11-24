package com.t1membership.auth.service;

import com.t1membership.auth.dto.tokenDto.TokenReq;

public interface BlacklistService {

    //access 토큰을 블랙리스트에 추가
    void addToBlacklist(TokenReq tokenReq);

    // 토큰이 현재 블랙리스트에 살아있는지 확인
    boolean isBlacklisted(TokenReq tokenReq);

    // 만료된 블랙리스트 행 정리(수동 호출용)
    void purgeExpired();
}
