// src/app/mypage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

interface Member {
    memberEmail: string;
    memberName: string;
    memberNickName: string;
    memberImage?: string | null; // 🔥 DB에서 오는 프로필 이미지 URL
}

// 🔥 백엔드 ApiResult 구조에 맞게 수정
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

export default function MyPageHome() {
    const router = useRouter();

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 마이페이지 진입 시 내 정보 조회
    useEffect(() => {
        const fetchMember = async () => {
            try {
                // 🔥 unwrap 필요 없음. result 에 바로 들어있음
                const res = await apiClient.get<ApiResult<Member>>("/member/readOne");
                console.log("readOne =", res.data);
                setMember(res.data.result);
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

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#050505",
                color: "white",
            }}
        >
            <Header />

            <div
                style={{
                    maxWidth: 900,
                    margin: "0 auto",
                    padding: "80px 16px 60px",
                }}
            >
                {/* 상단 프로필 카드 */}
                <div
                    onClick={() => router.push("/mypage/account")} // 클릭 시 내 정보 관리로 이동
                    style={{
                        borderRadius: 18,
                        backgroundColor: "#181818",
                        padding: "24px 28px",
                        marginBottom: 32,
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                    }}
                >
                    {/* 프로필 상단 영역 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                backgroundColor: "#f97373",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 26,
                                fontWeight: "bold",
                                overflow: "hidden",
                            }}
                        >
                            {member.memberImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={member.memberImage}
                                    alt="프로필"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            ) : (
                                <span>{displayInitial}</span>
                            )}
                        </div>

                        <div>
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    marginBottom: 4,
                                }}
                            >
                                {displayNick}
                            </div>
                            <div style={{ fontSize: 13, color: "#ccc" }}>
                                {member.memberEmail}
                            </div>
                        </div>
                    </div>

                    {/* 아래 이용권 / 포인트 영역 */}
                    <div
                        style={{
                            marginTop: 20,
                            paddingTop: 16,
                            borderTop: "1px solid #282828",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                        }}
                    >
                        <div>
                            <div style={{ color: "#aaa", marginBottom: 4 }}>내 이용권/티켓</div>
                            <div style={{ fontWeight: "bold" }}>0</div>
                        </div>
                        <div>
                            <div style={{ color: "#aaa", marginBottom: 4 }}>T1 Point</div>
                            <div style={{ fontWeight: "bold" }}>0 P</div>
                        </div>
                    </div>
                </div>

                {/* 메뉴 리스트 */}
                <div
                    style={{
                        borderTop: "1px solid #222",
                    }}
                >
                    {[
                        "멤버십 가입하기",
                        "주문 내역",
                        "내가 쓴 글",
                        "내 정보 관리",
                        "내 리워드",
                        "언어",
                        "통화",
                        "알림 설정",
                        "이용약관",
                        "고객센터",
                        "이벤트",
                        "공지사항",
                    ].map((label) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => {
                                if (label === "내 정보 관리") {
                                    router.push("/mypage/account");
                                } else if (label === "주문 내역") {
                                    router.push("/order"); // TODO: 실제 경로로 수정
                                } else {
                                    // TODO: 나머지 메뉴 라우트 연결
                                }
                            }}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "14px 4px",
                                border: "none",
                                borderBottom: "1px solid #222",
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
                            <span style={{ color: "#555" }}>›</span>
                        </button>
                    ))}

                    {/* 로그아웃 */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "14px 4px",
                            border: "none",
                            borderBottom: "1px solid #222",
                            background: "transparent",
                            color: "#fca5a5",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                        }}
                    >
                        <span>로그아웃</span>
                        <span style={{ color: "#555" }}>›</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
