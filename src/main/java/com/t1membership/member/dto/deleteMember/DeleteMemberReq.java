package com.t1membership.member.dto.deleteMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteMemberReq {
    private String memberEmail;
    private String currentPw;//탈퇴확인용 비번
}
