package com.t1membership.member.dto.joinMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinMemberRes {
    private String memberId;
    private String memberPw;
    private String memberName;
    private String memberNickName;
    private String memberEmail;
    private String memberPhone;
    private String memberAddress;
}
