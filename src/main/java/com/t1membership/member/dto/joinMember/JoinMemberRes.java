package com.t1membership.member.dto.joinMember;

import com.t1membership.member.domain.MemberEntity;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinMemberRes {

    private String memberPw;
    private String memberName;
    private String memberNickName;
    private String memberEmail;
    private String memberPhone;
    private String memberAddress;

    public static JoinMemberRes from(MemberEntity memberEntity) {
        return JoinMemberRes.builder()
                .memberEmail(memberEntity.getMemberEmail())
                .build();
    }
}
