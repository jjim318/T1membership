// src/types/member.ts

// 공통 API 래퍼
export interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 🔥 /member/readOne, /member/profile 에서 쓰는 멤버 정보 DTO
// 백엔드 JSON 구조랑 1:1 매칭
export interface MemberInfo {
    memberName: string;                // "최현준"
    memberNickName: string;            // "도란"  ← 프로필에서 쓰는 닉네임
    memberEmail: string;               // "test3@test.com"
    memberPhone: string;               // "01012341234"

    // 백엔드: memberImage -> "/files/xxx.jpg" or "/images/default-profile.png"
    memberImage?: string | null;

    // 이전 코드에서 썼던 가능성까지 커버 (혹시 다른 데서 쓰고 있을지도 몰라서 같이 둠)
    profileImageUrl?: string | null;

    memberGender: string;              // "MALE"
    memberBirthY: string;              // "2000"
    memberRole: string;                // "USER"
}
