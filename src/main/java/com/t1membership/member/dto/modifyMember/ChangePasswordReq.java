package com.t1membership.member.dto.modifyMember;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordReq {
    @NotBlank
    private String currentPassword;   // 기존 비번

    @NotBlank
    private String newPassword;       // 새 비번

    @NotBlank
    private String confirmPassword;   // 새 비번 확인
}
