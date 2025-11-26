package com.t1membership.member.dto.readOneMember;

import com.t1membership.member.constant.MemberRole;
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

    private String memberName;
    private String memberNickName;
    private String memberEmail;
    private String memberPhone;
    private String memberImage;
    private String memberGender;
    private String memberBirthY;

    private MemberRole memberRole;

    public static ReadOneMemberRes from(MemberEntity memberEntity) {
        if (memberEntity == null) {
            return null;
        }

        return ReadOneMemberRes.builder()
                .memberEmail(memberEntity.getMemberEmail())
                .memberName(memberEntity.getMemberName())
                .memberNickName(memberEntity.getMemberNickName())
                .memberPhone(memberEntity.getMemberPhone())
                .memberImage(memberEntity.getMemberImage()) // 🔥 이미지 URL
                .memberRole(memberEntity.getMemberRole())
                .memberGender(memberEntity.getMemberGender())
                .memberBirthY(memberEntity.getMemberBirthY())
                .build();
    }

}
