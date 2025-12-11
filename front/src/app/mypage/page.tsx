// src/app/mypage/page.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

interface Member {
    memberEmail: string;
    memberName: string;
    memberNickName: string;
    memberImage?: string | null; // 🔥 DB에서 오는 프로필 이미지 URL (상대경로 가능)
}

// 🔥 백엔드 ApiResult 구조에 맞게 수정
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

/**
 * 백엔드에서 오는 memberImage(/files/xxx.jpg 같은 상대경로)를
 * 화면에서 바로 쓸 수 있는 절대 URL로 변환
 */
function resolveProfileUrl(raw?: string | null): string | null {
    if (!raw) return null;

    // 이미 절대 URL이면 그대로 사용
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }

    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const normalizedRaw = raw.startsWith("/") ? raw : `/${raw}`;

    return `${normalizedBase}${normalizedRaw}`;
}

export default function MyPageHome() {
    const router = useRouter();

    const [member, setMember] = useState<Member | null>(null);
    const [profileUrl, setProfileUrl] = useState<string | null>(null); // 🔥 가공된 이미지 URL
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 마이페이지 진입 시 내 정보 조회
    useEffect(() => {
        const fetchMember = async () => {
            try {
                const res = await apiClient.get<ApiResult<Member>>("/member/readOne");
                console.log("readOne =", res.data);

                const m = res.data.result;
                setMember(m);

                // 🔥 여기서 한 번 절대 URL로 바꿔서 상태에 저장
                const resolved = resolveProfileUrl(m.memberImage);
                setProfileUrl(resolved);
            } catch (err) {
                console.error("회원 정보 조회 실패:", err);
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    router.push("/login");
                } else {
                    setErrorMsg("회원 정보를 불러오는 중 오류가 발생했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchMember();
    }, [router]);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("memberEmail");
            window.dispatchEvent(new Event("loginStateChange"));
        }
        router.push("/");
    };

    if (loading) {
        return (
            <div
                style={{ minHeight: "100vh", backgroundColor: "#050505", color: "white" }}
            >
                <Header />
                <div
                    style={{
                        minHeight: "calc(100vh - 64px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    로딩 중...
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div
                style={{ minHeight: "100vh", backgroundColor: "#050505", color: "white" }}
            >
                <Header />
                <div
                    style={{
                        minHeight: "calc(100vh - 64px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {errorMsg ?? "회원 정보를 찾을 수 없습니다."}
                </div>
            </div>
        );
    }

    // 닉네임/이니셜 표시용
    const displayNick =
        member.memberNickName?.trim() || member.memberName || "T1 회원";
    const displayInitial = displayNick[0] ?? "T";

    // 아바타 내용 (이미지 있으면 이미지, 없으면 이니셜)
    let avatarContent: ReactNode;
    if (profileUrl) {
        // eslint-disable-next-line @next/next/no-img-element
        avatarContent = (
            <img
                src={profileUrl}
                alt="프로필"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
        );
    } else {
        avatarContent = <span>{displayInitial}</span>;
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#050505",
                color: "white",
            }}
        >
            <Header />

            {/* === 공식 사이트처럼 중앙 레이아웃 === */}
            <div
                style={{
                    maxWidth: 900,
                    margin: "0 auto",
                    padding: "80px 16px 60px",
                }}
            >
                {/* 상단 타이틀: 내 정보 관리 */}
                <h1
                    style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        marginBottom: 40,
                    }}
                >
                    내 정보 관리
                </h1>

                {/* ===== 프로필 영역 (가운데 정렬) ===== */}
                <section
                    style={{
                        width: "100%",
                        marginBottom: 48,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    {/* 프로필 이미지 동그라미 */}
                    <div
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: "50%",
                            backgroundColor: "#f97373",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            fontSize: 40,
                            fontWeight: "bold",
                        }}
                    >
                        {avatarContent}
                    </div>

                    {/* 닉네임 */}
                    <div
                        style={{
                            fontSize: 20,
                            fontWeight: 600,
                            marginBottom: 4,
                        }}
                    >
                        {displayNick}
                    </div>

                    {/* 이메일 */}
                    <div
                        style={{
                            fontSize: 13,
                            color: "#b3b3b3",
                            marginBottom: 24,
                        }}
                    >
                        {member.memberEmail}
                    </div>

                    {/* 프로필 수정 버튼 */}
                    <button
                        type="button"
                        // 형님 프로필 수정 페이지 경로에 맞춰서 수정
                        onClick={() => router.push("/mypage/account/profile")}
                        style={{
                            width: "100%",
                            maxWidth: 620,
                            height: 48,
                            borderRadius: 4,
                            backgroundColor: "#1a1a1a",
                            border: "none",
                            color: "white",
                            fontSize: 14,
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                        }}
                    >
                        프로필 수정
                    </button>
                </section>

                {/* ===== 아래 메뉴 리스트 (비밀번호 변경 / 회원정보 변경 / 로그인 관리 / 회원 탈퇴) ===== */}
                <section
                    style={{
                        width: "100%",
                        maxWidth: 620,
                        margin: "0 auto",
                        borderTop: "1px solid #262626",
                    }}
                >
                    <MypageRow
                        label="비밀번호 변경"
                        onClick={() => router.push("/mypage/password")}
                    />
                    <MypageRow
                        label="회원정보 변경"
                        onClick={() => router.push("/mypage/edit")}
                    />
                    <MypageRow
                        label="로그인 관리"
                        onClick={() => router.push("/mypage/login-manage")}
                    />
                    <MypageRow
                        label="회원 탈퇴"
                        onClick={() => router.push("/mypage/delete")}
                    />
                </section>
            </div>
        </div>
    );
}

function MypageRow({
                       label,
                       onClick,
                   }: {
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: "100%",
                height: 52,
                border: "none",
                borderBottom: "1px solid #262626",
                background: "transparent",
                color: "white",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
            }}
        >
            <span>{label}</span>
            {/* 오른쪽 화살표 */}
            <span style={{ color: "#777777", fontSize: 18 }}>›</span>
        </button>
    );
}
