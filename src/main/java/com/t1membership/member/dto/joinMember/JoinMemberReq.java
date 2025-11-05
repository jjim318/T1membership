package com.t1membership.member.dto.joinMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinMemberReq {
    private String memberEmail;
    private String memberPw;
    private String memberName;
    private String memberNickName;
    private String memberBirthY;
    private String memberPhone;
    private String memberAddress;
}
