package com.t1membership.auth.service;

import com.t1membership.auth.dto.loginDto.LoginReq;
import com.t1membership.auth.dto.tokenDto.TokenReq;
import com.t1membership.auth.dto.tokenDto.TokenRes;

public interface AuthService {
    public TokenRes login(LoginReq loginReq);
    public TokenRes refresh(TokenReq tokenReq);
    public void logout(TokenReq tokenReq);
}
