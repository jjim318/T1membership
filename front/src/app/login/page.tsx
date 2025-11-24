"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";
import Header from "@/components/layout/Header";

type LoginStep = "EMAIL" | "PASSWORD";

interface TokenPayload {
    accessToken: string;
    refreshToken: string;
    memberEmail: string;
}

interface ApiResult<T> {
    data: T;
}

interface EmailExistsRes {
    exists: boolean;
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialEmail = searchParams.get("email") ?? "";

    const [step, setStep] = useState<LoginStep>("EMAIL");
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [keepLogin, setKeepLogin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 회원가입 모달
    const [showSignupModal, setShowSignupModal] = useState(false);

    // ===== 1단계: 이메일 입력 후 "계속하기" 클릭 =====
    const handleEmailNext = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) {
            setErrorMsg("이메일을 입력해주세요.");
            return;
        }

        setErrorMsg(null);

        try {
            // ✅ 이메일 존재 여부 확인 API 호출
            const res = await apiClient.get<EmailExistsRes>(
                `/member/exists`,
                { params: { email } },
            );

            if (res.data.exists) {
                // 이미 가입된 회원 → 비밀번호 단계로
                setStep("PASSWORD");
            } else {
                // 가입 안 된 이메일 → 회원가입 모달 오픈
                setShowSignupModal(true);
            }
        } catch (err) {
            console.error("이메일 체크 실패:", err);
            setErrorMsg("이메일 확인 중 오류가 발생했습니다.");
        }
    };

    // ===== 뒤로가기 버튼 =====
    const handleBack = () => {
        if (step === "PASSWORD") {
            setStep("EMAIL");
            setPassword("");
            setErrorMsg(null);
        } else {
            router.back();
        }
    };

    // ===== 2단계: 비밀번호 입력 후 실제 로그인(JWT) =====
    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (!password) {
            setErrorMsg("비밀번호를 입력해주세요.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await apiClient.post<ApiResult<TokenPayload> | TokenPayload>(
                "/auth/login",
                {
                    memberEmail: email,
                    memberPw: password,
                },
            );

            const raw = res.data;
            const payload: TokenPayload =
                (raw as ApiResult<TokenPayload>).data ?? (raw as TokenPayload);

            const { accessToken, refreshToken, memberEmail } = payload;

            if (!accessToken) {
                throw new Error("accessToken이 응답에 없습니다.");
            }

            if (typeof window !== "undefined") {
                localStorage.setItem("accessToken", accessToken);

                // keepLogin 체크되었을 때만 refresh 저장하게 하고 싶으면 조건으로 감싸면 됨
                if (refreshToken && keepLogin) {
                    localStorage.setItem("refreshToken", refreshToken);
                }

                if (memberEmail) {
                    localStorage.setItem("memberEmail", memberEmail);
                }

                window.dispatchEvent(new Event("loginStateChange"));
            }

            alert("로그인 성공!");
            router.push("/mypage");
        } catch (err) {
            console.error("로그인 실패:", err);
            if (axios.isAxiosError(err)) {
                const msg =
                    (err.response?.data as { message?: string })?.message ??
                    "이메일 또는 비밀번호가 올바르지 않습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setLoading(false);
        }
    };

    // ===== 가입 모달에서 "가입하기" 클릭 =====
    const goSignup = () => {
        setShowSignupModal(false);
        // 이메일을 쿼리스트링으로 넘겨서 회원가입 폼에서 그대로 사용
        router.push(`/join?email=${encodeURIComponent(email)}`);
    };

    // ====== UI ======
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
                    minHeight: "calc(100vh - 64px)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "40px 16px",
                }}
            >
                <div
                    style={{
                        width: 480,
                        padding: 32,
                        borderRadius: 16,
                        border: "1px solid #333",
                        backgroundColor: "#111",
                    }}
                >
                    {/* 상단 뒤로가기 + 타이틀 */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        <button
                            type="button"
                            onClick={handleBack}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 999,
                                border: "none",
                                backgroundColor: "#222",
                                color: "#fff",
                                cursor: "pointer",
                            }}
                        >
                            ←
                        </button>

                        <div>
                            <div style={{ fontSize: 12, color: "#aaa" }}>T1 MEMBERSHIP</div>
                            <h1
                                style={{
                                    fontSize: 22,
                                    fontWeight: "bold",
                                    marginTop: 4,
                                }}
                            >
                                {step === "EMAIL"
                                    ? "이메일로 가입 또는 로그인"
                                    : "다시 오신것을 환영해요"}
                            </h1>
                            {step === "PASSWORD" && (
                                <div style={{ fontSize: 13, color: "#ccc", marginTop: 4 }}>
                                    {email} 으로 로그인합니다
                                </div>
                            )}
                        </div>
                    </div>

                    {errorMsg && (
                        <div
                            style={{
                                marginBottom: 12,
                                fontSize: 13,
                                color: "#fca5a5",
                            }}
                        >
                            {errorMsg}
                        </div>
                    )}

                    {step === "EMAIL" && (
                        <form
                            onSubmit={handleEmailNext}
                            style={{ display: "flex", flexDirection: "column", gap: 12 }}
                        >
                            <label
                                style={{
                                    display: "block",
                                    fontSize: 13,
                                    marginBottom: 6,
                                    color: "#ccc",
                                }}
                            >
                                이메일
                            </label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@t1.com"
                                style={{
                                    width: "100%",
                                    padding: "12px 14px",
                                    borderRadius: 999,
                                    border: "1px solid #555",
                                    backgroundColor: "#181818",
                                    color: "white",
                                    fontSize: 14,
                                }}
                            />

                            <button
                                type="submit"
                                style={{
                                    marginTop: 16,
                                    width: "100%",
                                    padding: "12px 14px",
                                    borderRadius: 999,
                                    border: "none",
                                    backgroundColor: "#d93400",
                                    color: "white",
                                    fontWeight: "bold",
                                    fontSize: 14,
                                    cursor: "pointer",
                                }}
                            >
                                계속하기
                            </button>
                        </form>
                    )}

                    {step === "PASSWORD" && (
                        <form
                            onSubmit={handleLogin}
                            style={{ display: "flex", flexDirection: "column", gap: 12 }}
                        >
                            <label
                                style={{
                                    display: "block",
                                    fontSize: 13,
                                    marginBottom: 6,
                                    color: "#ccc",
                                }}
                            >
                                비밀번호
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호를 입력해주세요"
                                style={{
                                    width: "100%",
                                    padding: "12px 14px",
                                    borderRadius: 12,
                                    border: "1px solid #555",
                                    backgroundColor: "#181818",
                                    color: "white",
                                    fontSize: 14,
                                }}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: 16,
                                    width: "100%",
                                    padding: "12px 14px",
                                    borderRadius: 999,
                                    border: "none",
                                    backgroundColor: loading ? "#555" : "#d93400",
                                    color: "white",
                                    fontWeight: "bold",
                                    fontSize: 14,
                                    cursor: loading ? "default" : "pointer",
                                }}
                            >
                                {loading ? "로그인 중..." : "로그인"}
                            </button>

                            <div
                                style={{
                                    marginTop: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    fontSize: 12,
                                    color: "#aaa",
                                }}
                            >
                                <label
                                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={keepLogin}
                                        onChange={(e) => setKeepLogin(e.target.checked)}
                                    />
                                    로그인 상태 유지
                                </label>
                                <span style={{ cursor: "pointer" }}>비밀번호를 잊으셨나요?</span>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* ===== 회원가입 모달 ===== */}
            {showSignupModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 50,
                    }}
                >
                    <div
                        style={{
                            width: 420,
                            borderRadius: 16,
                            backgroundColor: "#1e1e1e",
                            padding: 24,
                            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                        }}
                    >
                        <h2
                            style={{
                                fontSize: 18,
                                fontWeight: "bold",
                                marginBottom: 8,
                                textAlign: "center",
                            }}
                        >
                            회원가입이 필요해요
                        </h2>
                        <p
                            style={{
                                fontSize: 13,
                                color: "#ccc",
                                marginBottom: 24,
                                textAlign: "center",
                            }}
                        >
                            입력한 이메일로 회원가입을 진행해 주세요.
                        </p>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setShowSignupModal(false)}
                                style={{
                                    flex: 1,
                                    padding: "10px 0",
                                    borderRadius: 999,
                                    border: "none",
                                    backgroundColor: "#333",
                                    color: "#fff",
                                    fontSize: 14,
                                    cursor: "pointer",
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={goSignup}
                                style={{
                                    flex: 1,
                                    padding: "10px 0",
                                    borderRadius: 999,
                                    border: "none",
                                    backgroundColor: "#d93400",
                                    color: "#fff",
                                    fontSize: 14,
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                }}
                            >
                                가입하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
