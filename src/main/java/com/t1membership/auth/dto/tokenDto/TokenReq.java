package com.t1membership.auth.dto.tokenDto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenReq {
    private String accessToken;
    private String refreshToken;
}
