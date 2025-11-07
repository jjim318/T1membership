package com.t1membership.member.service;

import com.t1membership.member.constant.MemberRole;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.dto.deleteMember.DeleteMemberReq;
import com.t1membership.member.dto.deleteMember.DeleteMemberRes;
import com.t1membership.member.dto.joinMember.JoinMemberReq;
import com.t1membership.member.dto.joinMember.JoinMemberRes;
import com.t1membership.member.dto.modifyMember.ModifyMemberReq;
import com.t1membership.member.dto.modifyMember.ModifyMemberRes;
import com.t1membership.member.dto.readAllMember.ReadAllMemberRes;
import com.t1membership.member.dto.readOneMember.ReadOneMemberReq;
import com.t1membership.member.dto.readOneMember.ReadOneMemberRes;
import com.t1membership.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final MemberRepository memberRepository;
    private final ModelMapper modelMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public JoinMemberRes joinMember(JoinMemberReq joinMemberReq) {

        String memberId = joinMemberReq.getMemberEmail();
        if (memberRepository.existsById(memberId)) {
            throw new MemberIdExistException("이미 존재하는 회원의 이메일입니다.");
        }
        MemberEntity memberEntity = modelMapper.map(joinMemberReq, MemberEntity.class);
        memberEntity.setMemberEmail(memberId);
        memberEntity.setMemberPw((passwordEncoder.encode(joinMemberReq.getMemberPw())));

        memberEntity.setMemberRole(MemberRole.USER);

        MemberEntity savedMemberEntity = memberRepository.save(memberEntity);
        return JoinMemberRes.from(savedMemberEntity);
    }

    @Override
    public ReadAllMemberRes readAllMember() {
        return null;
    }

    @Override
    @PreAuthorize("isAuthenticated() and (hasRole('ADMIN') or #p0.memberEmail == authentication.name)")
    //isAuthenticated() : 로그인(인증)이 되어야 진입가능
    //hasRole('ADMIN') : 어드민이면 무조건 통과
    //#p0.memberId == authentication.name : 첫 번째 파라미터(#p.0)인 readOneMemberReq의 memberEmail과 현재 로그인한 사용자의 이름(authentication.name)과 같아야 통과
    @Transactional(readOnly = true)//읽기 전용 트랜잭션
    //조회 성능/안전성(우발적 flush 방지)에 유리
    public ReadOneMemberRes readOneMember(ReadOneMemberReq readOneMemberReq) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String memberId = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        if (!isAdmin && !memberRepository.existsById(memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"본인 정보만 조회할 수 있습니다");
        }

        MemberEntity memberEntity = memberRepository.findById(memberId)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"회원을 찾을 수 없습니다"));
        return ReadOneMemberRes.from(memberEntity);
    }

    @Override
    public ModifyMemberRes modifyMember(ModifyMemberReq modifyMemberReq) {
        return null;
    }

    @Override
    public DeleteMemberRes deleteMember(DeleteMemberReq deleteMemberReq) {
        return null;
    }

}
