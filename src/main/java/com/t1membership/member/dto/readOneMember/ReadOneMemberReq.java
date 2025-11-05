package com.t1membership.member.dto.readOneMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadOneMemberReq {
    private String memberId;
    private String memberName;
    private String memberNickName;
    private String memberPhone;
}
