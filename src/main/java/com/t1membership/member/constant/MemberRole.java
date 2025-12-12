package com.t1membership.member.constant;

public enum MemberRole {
    USER, //회원
    BLACKLIST, //블랙리스트
    ADMIN, //관리자
    ADMIN_CONTENT, // 컨텐츠 페이지 담당 관리자

    //PLAYER 하나로 묶지 말아야 함 → 누가 썼는지 구분 안 됨
    T1,            // 공식 T1 관리자 (스토리 작성)
    PLAYER_DORAN,
    PLAYER_ONER,
    PLAYER_FAKER,
    PLAYER_GUMAYUSI,
    PLAYER_KERIA
}
