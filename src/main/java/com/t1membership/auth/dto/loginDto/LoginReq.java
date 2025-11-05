package com.t1membership.auth.dto.loginDto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginReq {
    private String memberEmail;
    private String memberPw;
}
