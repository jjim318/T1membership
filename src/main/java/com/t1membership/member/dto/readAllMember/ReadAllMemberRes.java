package com.t1membership.member.dto.readAllMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadAllMemberRes {
    private String memberId;
    private String memberPw;
    private String memberName;
    private String memberNickName;
    private String memberEmail;
    private String memberPhone;
    private String memberAddress;
}
