package com.t1membership.member.dto.readAllMember;

import com.t1membership.member.domain.MemberEntity;
import lombok.*;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadAllMemberRes {
    private String memberEmail;
    private String memberPw;
    private String memberName;
    private String memberNickName;
    private String memberPhone;
    private String memberAddress;

    private static List<ReadAllMemberRes> memberList;

    public static ReadAllMemberRes from(MemberEntity member) {
        return ReadAllMemberRes.builder()
                .memberEmail(member.getMemberEmail())
                .memberNickName(member.getMemberNickName())
                .memberName(member.getMemberName())
                .memberPhone(member.getMemberPhone())
                .build();
    }

    public static List<ReadAllMemberRes> from(List<MemberEntity> memberEntityList) {
        ReadAllMemberRes readAllMemberRes = new ReadAllMemberRes();
        readAllMemberRes.memberList = memberEntityList.stream().map(ReadAllMemberRes::from).collect(Collectors.toList());
        return memberList;
    }
}
