"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

export default function JoinPage() {
    const router = useRouter();

    // 입력값 상태
    const [form, setForm] = useState({
        memberEmail: "",
        memberPw: "",
        memberName: "",
        memberNickName: "",
        memberBirthY: "",
        memberPhone: "",
        memberAddress: "",
    });

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 입력 변경 핸들러
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // 회원가입 요청
    const handleJoin = async () => {
        // 기본 유효성 검사
        if (
            !form.memberEmail ||
            !form.memberPw ||
            !form.memberName ||
            !form.memberNickName
        ) {
            setErrorMsg("필수 항목을 모두 입력해주세요.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await apiClient.post("/member/join", form);

            alert("회원가입 성공! 로그인 페이지로 이동합니다.");
            router.push("/login");
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const msg =
                    err.response?.data?.message ??
                    "회원가입 중 오류가 발생했습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setLoading(false);
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
                    width: 400,
                    padding: 32,
                    borderRadius: 16,
                    border: "1px solid #333",
                    backgroundColor: "#111",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                }}
            >
                {/* 상단 타이틀 */}
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
                    회원가입
                </h1>
                <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>
                    정보를 입력하여 계정을 생성하세요.
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

                {/* 입력 폼 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Input label="이메일" name="memberEmail" value={form.memberEmail} onChange={handleChange} />
                    <Input label="비밀번호" name="memberPw" value={form.memberPw} onChange={handleChange} type="password" />
                    <Input label="이름" name="memberName" value={form.memberName} onChange={handleChange} />
                    <Input label="닉네임" name="memberNickName" value={form.memberNickName} onChange={handleChange} />
                    <Input label="출생년도" name="memberBirthY" value={form.memberBirthY} onChange={handleChange} />
                    <Input label="전화번호" name="memberPhone" value={form.memberPhone} onChange={handleChange} />
                    <Input label="주소" name="memberAddress" value={form.memberAddress} onChange={handleChange} />
                </div>

                {/* 가입 버튼 */}
                <button
                    onClick={handleJoin}
                    disabled={loading}
                    style={{
                        marginTop: 20,
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
                    {loading ? "가입 중..." : "회원가입"}
                </button>
            </div>
        </div>
    );
}

function Input({
                   label,
                   name,
                   value,
                   onChange,
                   type = "text",
               }: {
    label: string;
    name: string;
    value: string;
    type?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                {label}
            </label>
            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={label + " 입력"}
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
    );
}
