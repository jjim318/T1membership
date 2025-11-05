package com.t1membership.member.dto.deleteMember;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteMemberReq {
    private String memberId;
}
