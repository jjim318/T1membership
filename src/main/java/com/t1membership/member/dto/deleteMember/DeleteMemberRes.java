package com.t1membership.member.dto.deleteMember;

import com.t1membership.member.domain.MemberEntity;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteMemberRes {
    private String memberEmail;

    public static DeleteMemberRes from(MemberEntity member) {
        return DeleteMemberRes.builder()
                .memberEmail(member.getMemberEmail())
                .build();
    }
}
