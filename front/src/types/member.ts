// src/types/member.ts

// ✅ 백엔드 공통 응답 래퍼 (T1membership ApiResult 기준)
export type ApiResult<T> = {
    isSuccess: boolean;   // 요청 성공 여부
    resCode: number;      // HTTP와 별개로 사용하는 내부 코드 (200, 400, 500 등)
    resMessage: string;   // 메시지 ("OK", "ERROR" 등)
    result: T;            // 실제 데이터
};

// ✅ /member/readOne 에서 내려오는 내 회원 정보 타입
export type MemberInfo = {
    memberEmail: string;      // 이메일 (아이디)
    memberName: string;       // 이름
    memberNickName: string;   // 닉네임
    memberImage?: string | null;
};
