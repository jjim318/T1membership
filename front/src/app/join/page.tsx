"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";
import Header from "@/components/layout/Header";

interface JoinForm {
    memberEmail: string;
    memberPw: string;
    memberNickName: string;
    memberName: string;
    memberBirthY: string;
    memberPhone: string;
    memberAddress: string;
}

export default function JoinPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const emailFromQuery = searchParams.get("email") ?? "";

    const [form, setForm] = useState<JoinForm>({
        memberEmail: emailFromQuery,
        memberPw: "",
        memberNickName: "",
        memberName: "",
        memberBirthY: "",
        memberPhone: "",
        memberAddress: "",
    });

    // 동의 체크박스
    const [agreeAll, setAgreeAll] = useState(false);
    const [agreeAge, setAgreeAge] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreeMarketingEmail, setAgreeMarketingEmail] = useState(false);
    const [agreeMarketingPush, setAgreeMarketingPush] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 전체 동의 토글
    const toggleAgreeAll = () => {
        const next = !agreeAll;
        setAgreeAll(next);
        setAgreeAge(next);
        setAgreePrivacy(next);
        setAgreeTerms(next);
        setAgreeMarketingEmail(next);
        setAgreeMarketingPush(next);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (loading) return;

        // 필수 동의 체크
        if (!agreeAge || !agreePrivacy || !agreeTerms) {
            setErrorMsg("필수 약관에 모두 동의해 주세요.");
            return;
        }

        // 필수 값 간단 검증
        if (!form.memberEmail || !form.memberPw || !form.memberName || !form.memberNickName) {
            setErrorMsg("이메일, 비밀번호, 이름, 닉네임은 필수입니다.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            await apiClient.post("/member/join", form);
            alert("회원가입이 완료되었습니다. 로그인 해 주세요.");
            router.push(`/login?email=${encodeURIComponent(form.memberEmail)}`);
        } catch (err) {
            console.error("회원가입 실패:", err);
            if (axios.isAxiosError(err)) {
                const msg =
                    (err.response?.data as { message?: string })?.message ??
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
                color: "white",
            }}
        >
            <Header />

            <div
                style={{
                    minHeight: "calc(100vh - 64px)",
                    display: "flex",
                    justifyContent: "center",
                    padding: "40px 16px",
                }}
            >
                <form
                    onSubmit={handleSubmit}
                    style={{
                        width: 540,
                        padding: 32,
                        borderRadius: 16,
                        border: "1px solid #333",
                        backgroundColor: "#111",
                    }}
                >
                    {/* 타이틀 */}
                    <button
                        type="button"
                        onClick={() => router.back()}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            border: "none",
                            backgroundColor: "#222",
                            color: "#fff",
                            cursor: "pointer",
                            marginBottom: 24,
                        }}
                    >
                        ←
                    </button>

                    <h1
                        style={{
                            fontSize: 24,
                            fontWeight: "bold",
                            marginBottom: 8,
                        }}
                    >
                        T1 Membership에 가입할게요
                    </h1>
                    <p
                        style={{
                            fontSize: 13,
                            color: "#aaa",
                            marginBottom: 24,
                        }}
                    >
                        {form.memberEmail} 으로 회원가입을 진행합니다.
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

                    {/* 이메일 (읽기 전용) */}
                    <Field label="이메일(필수)">
                        <input
                            name="memberEmail"
                            value={form.memberEmail}
                            onChange={handleChange}
                            readOnly={emailFromQuery !== ""}
                            style={inputStyle}
                        />
                    </Field>

                    {/* 비밀번호 */}
                    <Field label="비밀번호(필수)">
                        <input
                            type="password"
                            name="memberPw"
                            value={form.memberPw}
                            onChange={handleChange}
                            placeholder="비밀번호를 입력해주세요"
                            style={inputStyle}
                        />
                    </Field>

                    {/* 닉네임 */}
                    <Field label="닉네임(필수)">
                        <input
                            name="memberNickName"
                            value={form.memberNickName}
                            onChange={handleChange}
                            placeholder="닉네임을 입력해주세요"
                            style={inputStyle}
                        />
                    </Field>

                    {/* 이름 */}
                    <Field label="이름(필수)">
                        <input
                            name="memberName"
                            value={form.memberName}
                            onChange={handleChange}
                            placeholder="이름을 입력해주세요"
                            style={inputStyle}
                        />
                    </Field>

                    {/* 출생 연도 */}
                    <Field label="출생 연도(필수)">
                        <input
                            name="memberBirthY"
                            value={form.memberBirthY}
                            onChange={handleChange}
                            placeholder="YYYY"
                            style={inputStyle}
                            maxLength={4}
                        />
                    </Field>

                    {/* 전화번호 */}
                    <Field label="전화번호(필수)">
                        <div style={{ display: "flex", gap: 8 }}>
                            <div
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: "1px solid #333",
                                    backgroundColor: "#181818",
                                    fontSize: 14,
                                }}
                            >
                                +82
                            </div>
                            <input
                                name="memberPhone"
                                value={form.memberPhone}
                                onChange={handleChange}
                                placeholder="하이픈 없이 입력해주세요"
                                style={{ ...inputStyle, flex: 1 }}
                            />
                        </div>
                    </Field>

                    {/* 주소 (선택) */}
                    <Field label="주소(선택)">
                        <input
                            name="memberAddress"
                            value={form.memberAddress}
                            onChange={handleChange}
                            placeholder="주소를 입력해주세요"
                            style={inputStyle}
                        />
                    </Field>

                    {/* 약관 동의 */}
                    <div
                        style={{
                            marginTop: 24,
                            paddingTop: 16,
                            borderTop: "1px solid #333",
                        }}
                    >
                        <label style={checkboxRowStyle}>
                            <input
                                type="checkbox"
                                checked={agreeAll}
                                onChange={toggleAgreeAll}
                            />
                            <span>모두 동의</span>
                        </label>

                        <hr style={{ borderColor: "#333", margin: "12px 0" }} />

                        <label style={checkboxRowStyle}>
                            <input
                                type="checkbox"
                                checked={agreeAge}
                                onChange={(e) => setAgreeAge(e.target.checked)}
                            />
                            <span>[필수] 만 14세 이상입니다.</span>
                        </label>

                        <label style={checkboxRowStyle}>
                            <input
                                type="checkbox"
                                checked={agreePrivacy}
                                onChange={(e) => setAgreePrivacy(e.target.checked)}
                            />
                            <span>[필수] 개인정보 수집 및 이용 동의</span>
                        </label>

                        <label style={checkboxRowStyle}>
                            <input
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                            />
                            <span>[필수] 이용약관 동의</span>
                        </label>

                        <label style={checkboxRowStyle}>
                            <input
                                type="checkbox"
                                checked={agreeMarketingEmail}
                                onChange={(e) => setAgreeMarketingEmail(e.target.checked)}
                            />
                            <span>[선택] 이메일 마케팅 정보 수신 동의</span>
                        </label>

                        <label style={checkboxRowStyle}>
                            <input
                                type="checkbox"
                                checked={agreeMarketingPush}
                                onChange={(e) => setAgreeMarketingPush(e.target.checked)}
                            />
                            <span>[선택] 앱 푸시 마케팅 정보 수신 동의</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: 24,
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
                        {loading ? "가입 중..." : "가입하기"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ===== 공통 스타일 / 컴포넌트 =====

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    backgroundColor: "#181818",
    color: "white",
    fontSize: 14,
};

const checkboxRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    marginTop: 8,
};

interface FieldProps {
    label: string;
    children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div
                style={{
                    fontSize: 13,
                    marginBottom: 6,
                    color: "#ccc",
                }}
            >
                {label}
            </div>
            {children}
        </div>
    );
}
