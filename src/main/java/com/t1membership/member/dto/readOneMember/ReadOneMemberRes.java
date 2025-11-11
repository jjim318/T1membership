package com.t1membership.member.dto.readOneMember;

import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import lombok.*;

import java.util.List;

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

    public static ReadOneMemberRes from(MemberEntity memberEntity) {
        return ReadOneMemberRes.builder()
                .memberId(memberEntity.getMemberEmail())
                .build();
    }

}
