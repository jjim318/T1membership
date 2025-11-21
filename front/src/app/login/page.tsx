// src/app/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/apiClient";
import axios from "axios";



export default function LoginPage() {
    // 입력값 상태
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 로딩 상태 / 에러 메시지 상태
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter();

    // 로그인 버튼 눌렀을 때 실행되는 함수
    const handleLogin = async () => {
        // 1) 아주 기본 유효성 검사
        if (!email || !password) {
            setErrorMsg("이메일과 비밀번호를 모두 입력해주세요.");
            return;
        }

        setLoading(true);      // 로딩 시작
        setErrorMsg(null);     // 이전 에러 초기화

        try {
            // 2) 스프링 백엔드로 로그인 요청 보내기
            // 형님 백엔드 요청 DTO에 맞게 key 이름은 필요하면 바꾸면 됨
            // 예) memberEmail, memberPw 이런 식이면 그에 맞게 수정
            const res = await apiClient.post("/auth/login", {
                memberEmail: email,
                memberPw: password,
            });

            console.log("로그인 성공:", res.data);

            // 3) 응답에서 accessToken 꺼내서 저장 (이름은 형님 DTO에 맞추기)
            const accessToken = res.data.accessToken;
            if (accessToken) {
                localStorage.setItem("accessToken", accessToken);
            }

            alert("로그인 성공!");

            // 4) 메인 페이지나 마이페이지로 이동
            router.push("/");
        } catch (err: unknown) {
            console.error("로그인 실패:", err);

            if (axios.isAxiosError(err)) {
                const msg =
                    err.response?.data?.message ??
                    "이메일 또는 비밀번호가 올바르지 않습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("알 수 없는 오류가 발생했습니다.");
            }
        }
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
                {/* 로고 영역 */}
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

                {/* 제목 */}
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

                {/* 에러 메시지 */}
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

                {/* 입력폼 */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    {/* 이메일 */}
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

                    {/* 비밀번호 */}
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

                    {/* 로그인 버튼 */}
                    <button
                        type="button"
                        onClick={handleLogin}
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
                </div>

                {/* 아래 링크 자리 */}
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
