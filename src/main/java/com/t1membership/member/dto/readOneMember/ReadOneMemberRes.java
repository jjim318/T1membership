package com.t1membership.member.dto.readOneMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadOneMemberRes {
    private String memberId;
    private String memberPw;
    private String memberName;
    private String memberNickName;
    private String memberEmail;
    private String memberPhone;
    private String memberAddress;
}
