package com.t1membership.member.dto.modifyMember;

import com.t1membership.member.domain.MemberEntity;
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

    public static ModifyMemberRes from(MemberEntity memberEntity) {
        return ModifyMemberRes.builder()
                .memberPw(memberEntity.getMemberPw())
                .memberNickName(memberEntity.getMemberNickName())
                .memberAddress(memberEntity.getMemberAddress())
                .memberPhone(memberEntity.getMemberPhone())
                .build();
    }
}
