package com.t1membership.auth.dto.tokenDto;

import com.t1membership.auth.domain.AuthEntity;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenRes {
    private String accessToken;
    private String refreshToken;

    private String memberRole;

}
