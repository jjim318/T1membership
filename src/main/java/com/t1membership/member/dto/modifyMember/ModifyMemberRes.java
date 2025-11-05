package com.t1membership.member.dto.modifyMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyMemberRes {
    private String memberPw;
    private String memberNickName;
    private String memberEmail;
    private String memberPhone;
    private String memberAddress;
}
