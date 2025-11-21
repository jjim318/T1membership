// src/app/login/page.tsx

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

// 백엔드 토큰 응답 (안에 들어있는 순수 토큰 객체)
interface TokenPayload {
    accessToken: string;
    refreshToken: string;
    memberEmail: string;
}

// ApiResult 래핑 가능성도 고려
interface ApiResult<T> {
    data: T;
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter();

    // 실제 로그인 요청
    const handleLogin = async () => {
        if (loading) return;

        if (!email || !password) {
            setErrorMsg("이메일과 비밀번호를 모두 입력해주세요.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            // 🔥 로그인 요청
            const res = await apiClient.post<ApiResult<TokenPayload> | TokenPayload>(
                "/auth/login",
                {
                    memberEmail: email,
                    memberPw: password,
                },
            );

            console.log("로그인 응답 raw:", res.data);

            // 🔥 응답이 ApiResult<T> 이든, 그냥 T 이든 둘 다 커버
            const raw = res.data as any;
            const payload: TokenPayload = raw.data ?? raw;

            const { accessToken, refreshToken, memberEmail } = payload || {};

            console.log("파싱된 토큰 payload:", payload);

            if (!accessToken) {
                throw new Error("서버에서 accessToken을 받지 못했습니다.");
            }

            // 로컬 저장
            localStorage.setItem("accessToken", accessToken);
            if (refreshToken) {
                localStorage.setItem("refreshToken", refreshToken);
            }
            if (memberEmail) {
                localStorage.setItem("memberEmail", memberEmail);
            }

            // 전역 로그인 상태 알림
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("loginStateChange"));
            }

            alert("로그인 성공!");
            router.push("/"); // 필요하면 /mypage 로 바꿔도 됨
        } catch (err: unknown) {
            console.error("로그인 실패:", err);

            if (axios.isAxiosError(err)) {
                const msg =
                    (err.response?.data as { message?: string })?.message ??
                    "이메일 또는 비밀번호가 올바르지 않습니다.";
                setErrorMsg(msg);
            } else if (err instanceof Error) {
                setErrorMsg(err.message);
            } else {
                setErrorMsg("알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await handleLogin();
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#050505",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
            }}
        >
            <div
                style={{
                    width: 360,
                    padding: 32,
                    borderRadius: 16,
                    border: "1px solid #333",
                    backgroundColor: "#111",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                }}
            >
                {/* 로고 */}
                <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <div
                        style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            letterSpacing: "0.2em",
                            color: "#f87171",
                        }}
                    >
                        T1 MEMBERSHIP
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>
                        T1 팬들을 위한 멤버십 서비스 (클론 코딩)
                    </div>
                </div>

                <h1
                    style={{
                        fontSize: 24,
                        marginBottom: 8,
                        fontWeight: "bold",
                    }}
                >
                    로그인
                </h1>
                <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>
                    T1 멤버십에 접속하려면 이메일과 비밀번호를 입력하세요.
                </p>

                {errorMsg && (
                    <div
                        style={{
                            marginBottom: 16,
                            fontSize: 13,
                            color: "#fca5a5",
                        }}
                    >
                        {errorMsg}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                        >
                            이메일
                        </label>
                        <input
                            type="email"
                            placeholder="이메일을 입력하세요"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #333",
                                backgroundColor: "#0b0b0b",
                                color: "white",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                        >
                            비밀번호
                        </label>
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #333",
                                backgroundColor: "#0b0b0b",
                                color: "white",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: 8,
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 999,
                            border: "none",
                            background: loading
                                ? "gray"
                                : "linear-gradient(90deg, #ef4444, #f97316)",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: 14,
                            cursor: loading ? "default" : "pointer",
                        }}
                    >
                        {loading ? "로그인 중..." : "로그인"}
                    </button>
                </form>

                <div
                    style={{
                        marginTop: 20,
                        fontSize: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        color: "#aaa",
                    }}
                >
                    <span>계정이 없으신가요? 회원가입</span>
                    <span>비밀번호 찾기</span>
                </div>
            </div>
        </div>
    );
}
