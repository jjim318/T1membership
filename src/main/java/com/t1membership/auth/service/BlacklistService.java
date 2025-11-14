package com.t1membership.auth.service;

import com.t1membership.auth.dto.tokenDto.TokenReq;

public interface BlacklistService {
    //access 토큰을 블랙리스트에 추가
    void addToBlacklist(TokenReq tokenReq);
}
