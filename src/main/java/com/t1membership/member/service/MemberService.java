package com.t1membership.member.service;

import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyProfileReq;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import com.t1membership.member.dto.readOneMember.ReadOneMemberReq;
import com.t1membership.member.dto.readOneMember.ReadOneMemberRes;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MemberService {
    JoinMemberRes joinMember(JoinMemberReq joinMemberReq);
    List<ReadAllMemberRes> readAllMember();
    ReadOneMemberRes readOneMember(ReadOneMemberReq readOneMemberReq);
    ModifyMemberRes modifyMember(ModifyMemberReq modifyMemberReq, MultipartFile multipartFile, Boolean removeProfile);
    ModifyMemberRes modifyProfile(ModifyProfileReq req, MultipartFile profileFile, Boolean removeProfile);
    DeleteMemberRes deleteMember(DeleteMemberReq deleteMemberReq);
    boolean existsByEmail(String email);
}
