package com.t1membership.member.dto.modifyMember;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyProfileReq {
    // 관리자용: 다른 회원 프로필 수정할 때만 사용
    // 일반 회원은 서비스에서 loginEmail 로 강제 세팅
    private String memberEmail;

    @NotBlank(message = "닉네임은 필수입니다.")
    private String memberNickName;
}
