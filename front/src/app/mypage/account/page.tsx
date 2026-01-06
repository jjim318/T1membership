// src/app/mypage/account/page.tsx
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
    memberImage?: string | null;
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

export default function MyPageAccountPage() {
    const router = useRouter();
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const res = await apiClient.get<ApiResult<Member>>("/member/readOne");
                console.log("readOne (account) =", res.data);
                setMember(res.data.result);
            } catch (e) {
                console.error(e);
                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    router.push("/login");
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
            <div style={{ minHeight: "100vh", backgroundColor: "#050505", color: "#fff" }}>
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

    const displayNick =
        member?.memberNickName?.trim() || member?.memberName || "T1 회원";
    const displayInitial = displayNick[0] ?? "T";

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#050505", color: "#fff" }}>
            <Header />

            <div
                style={{
                    maxWidth: 900,
                    margin: "0 auto",
                    padding: "80px 16px 60px",
                }}
            >
                {/* 상단 타이틀 + 우측 프로필 */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 24,
                    }}
                >
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>내 정보 관리</h1>

                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 14, color: "#e5e5e5" }}>{displayNick}</span>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                backgroundColor: "#f97373",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                overflow: "hidden",
                            }}
                        >
                            {member?.memberImage ? (
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
                    </div>
                </div>

                {/* 프로필 수정 버튼 */}
                <button
                    type="button"
                    onClick={() => router.push("/mypage/account/profile")}
                    style={{
                        width: "100%",
                        borderRadius: 8,
                        backgroundColor: "#222",
                        color: "#fff",
                        padding: "12px 0",
                        border: "none",
                        fontSize: 14,
                        marginBottom: 24,
                        cursor: "pointer",
                    }}
                >
                    프로필 수정
                </button>

                {/* 메뉴 리스트 (비밀번호 변경 등) */}
                <div style={{ borderTop: "1px solid #222" }}>
                    <button
                        type="button"
                        onClick={() => {
                            // TODO: 비밀번호 변경 페이지 연결
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
                        <span>비밀번호 변경</span>
                        <span style={{ color: "#555" }}>›</span>
                    </button>

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
