package com.t1membership.member.dto.modifyMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyMemberReq {
    private String memberName;
    private String memberPhone;
    private String memberBirthY;
    private String memberGender;
}
