// src/types/member.ts

// 백엔드에서 /member/readOne 으로 내려주는 데이터 형태
export interface MemberInfo {
    memberName: string;
    birthYear?: number;
    memberPhone?: string;
    gender?: "MALE" | "FEMALE" | "NONE" | string; // 백엔드 enum에 맞춰서
    phoneCountryCode?: string;                    // "+82" 같은 값
}

// 공통 API 응답 래퍼
export interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}
