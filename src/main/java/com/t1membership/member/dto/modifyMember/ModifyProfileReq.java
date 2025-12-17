package com.t1membership.member.dto.modifyMember;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyProfileReq {
    @NotBlank(message = "닉네임은 필수입니다.")
    private String memberNickName;
}
