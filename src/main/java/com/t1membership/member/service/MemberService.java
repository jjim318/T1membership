package com.t1membership.member.service;

import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import com.t1membership.member.dto.readOneMember.ReadOneMemberReq;
import com.t1membership.member.dto.readOneMember.ReadOneMemberRes;

public interface MemberService {
    JoinMemberRes joinMember(JoinMemberReq joinMemberReq);
    ReadAllMemberRes readAllMember();
    ReadOneMemberRes readOneMember(ReadOneMemberReq readOneMemberReq);
    ModifyMemberRes modifyMember(ModifyMemberReq modifyMemberReq);
    DeleteMemberRes deleteMember(DeleteMemberReq deleteMemberReq);
    public static class MemberIdExistException extends RuntimeException {
        public MemberIdExistException(String message) { super(message); }
    }
}
