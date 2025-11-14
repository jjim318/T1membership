package com.t1membership.member.repository;

import com.t1membership.member.domain.MemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<MemberEntity, String> {
    boolean existsByNickname(String nickname);//닉네임 중복 체크
    boolean existsByMemberEmail(String memberEmail);//이메일 존재 여부 체크

    Optional<MemberEntity> findByMemberEmail(String memberEmail);//로그인 조회용
}
