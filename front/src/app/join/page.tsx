"use client";

import React, { useMemo, useState, type FormEvent } from "react";
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
    memberGender: string; // MALE / FEMALE
}

type FieldKey = keyof JoinForm | "agree";

type FieldErrors = Partial<Record<FieldKey, string>>;

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
        memberGender: "",
    });

    // 동의 체크박스
    const [agreeAll, setAgreeAll] = useState(false);
    const [agreeAge, setAgreeAge] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreeMarketingEmail, setAgreeMarketingEmail] = useState(false);
    const [agreeMarketingPush, setAgreeMarketingPush] = useState(false);

    const [loading, setLoading] = useState(false);

    // ✅ 전체 에러(상단/모달)
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ✅ 필드별 에러(빨간 테두리 + 밑 메시지)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // ✅ 모달 ON/OFF
    const [showModal, setShowModal] = useState(false);

    const requiredAgreeOk = useMemo(
        () => agreeAge && agreePrivacy && agreeTerms,
        [agreeAge, agreePrivacy, agreeTerms],
    );

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
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // ✅ 타이핑/선택하면 해당 필드 에러는 즉시 지움
        setFieldErrors((prev) => {
            const copy = { ...prev };
            delete copy[name as FieldKey];
            return copy;
        });
    };

    // ---------------------------
    // ✅ 프론트 1차 검증(여기서 걸러야 형님 UX가 산다)
    // ---------------------------
    const validateClient = (): { ok: boolean; errors: FieldErrors } => {
        const errors: FieldErrors = {};

        // 이메일
        if (!form.memberEmail?.trim()) {
            errors.memberEmail = "이메일은 필수입니다.";
        } else if (!/^\S+@\S+\.\S+$/.test(form.memberEmail.trim())) {
            errors.memberEmail = "이메일 형식이 올바르지 않습니다.";
        }

        // 비밀번호(스샷의 핵심: 특수문자 1개 이상)
        if (!form.memberPw) {
            errors.memberPw = "비밀번호는 필수입니다.";
        } else {
            const pw = form.memberPw;
            const hasSpecial = /[^A-Za-z0-9]/.test(pw); // 특수문자
            // 필요하면 길이/대소문자 규칙도 같이 넣으세요.
            if (!hasSpecial) {
                errors.memberPw = "비밀번호에는 특수문자가 최소 1개 이상 포함되어야 합니다.";
            }
            if (pw.length < 8) {
                errors.memberPw = "비밀번호는 8자 이상 입력해주세요.";
            }
        }

        // 닉네임/이름
        if (!form.memberNickName?.trim()) errors.memberNickName = "닉네임은 필수입니다.";
        if (!form.memberName?.trim()) errors.memberName = "이름은 필수입니다.";

        // 성별
        if (!form.memberGender) errors.memberGender = "성별을 선택해주세요.";

        // 출생연도
        if (!/^\d{4}$/.test(form.memberBirthY)) {
            errors.memberBirthY = "출생 연도를 YYYY 형식으로 입력해주세요.";
        }

        // 전화번호(숫자만)
        if (!form.memberPhone?.trim()) {
            errors.memberPhone = "전화번호는 필수입니다.";
        } else if (!/^\d{9,11}$/.test(form.memberPhone.trim())) {
            errors.memberPhone = "전화번호는 하이픈 없이 숫자만 입력해주세요.";
        }

        // 필수 동의
        if (!requiredAgreeOk) {
            errors.agree = "필수 약관에 모두 동의해 주세요.";
        }

        return { ok: Object.keys(errors).length === 0, errors };
    };

    // ---------------------------
    // ✅ 서버 에러 파싱(백엔드가 뭘 주든 최대한 캐치)
    // ---------------------------
    const parseServerError = (err: unknown): { message: string; fieldErrors?: FieldErrors } => {
        if (!axios.isAxiosError(err)) {
            return { message: "알 수 없는 오류가 발생했습니다." };
        }

        const status = err.response?.status;
        const data: any = err.response?.data;

        // 1) 형님 프로젝트에서 자주 쓰는 ApiResult 형태 추정
        // { isSuccess, resCode, resMessage, result }
        const apiResultMsg =
            (data && typeof data === "object" && (data.resMessage || data.message)) || null;

        // 2) 스프링 기본 에러 형태 추정
        // { message, error, path, ... }
        const springMsg = data?.message || data?.error || null;

        // 3) validation errors 배열/맵 형태 추정 (프로젝트마다 다름)
        // 예: { errors: [{field, defaultMessage}] } or { fieldErrors: {memberPw:"..."} }
        const fieldErrs: FieldErrors = {};

        const errorsArr = Array.isArray(data?.errors) ? data.errors : null;
        if (errorsArr) {
            for (const e of errorsArr) {
                const f = e?.field as FieldKey | undefined;
                const m = e?.defaultMessage || e?.message;
                if (f && m) fieldErrs[f] = String(m);
            }
        }

        const errorsMap = data?.fieldErrors || data?.errorsMap || data?.validationErrors;
        if (errorsMap && typeof errorsMap === "object" && !Array.isArray(errorsMap)) {
            for (const k of Object.keys(errorsMap)) {
                const key = k as FieldKey;
                fieldErrs[key] = String(errorsMap[k]);
            }
        }

        // 4) 메시지 문자열 그대로 오는 케이스
        const rawString = typeof data === "string" ? data : null;

        // 대표 메시지
        const message =
            rawString ||
            (apiResultMsg ? String(apiResultMsg) : null) ||
            (springMsg ? String(springMsg) : null) ||
            (status === 400
                ? "입력값이 올바르지 않습니다. (400)"
                : status === 401
                    ? "인증이 필요합니다. (401)"
                    : status === 403
                        ? "권한이 없습니다. (403)"
                        : "서버 오류가 발생했습니다.");

        // -----------------------
        // ✅ 메시지 기반 필드 매핑(백엔드가 field를 안 주는 경우 대비)
        // -----------------------
        const msg = message || "";
        if (msg.includes("비밀번호") && msg.includes("특수문자")) {
            fieldErrs.memberPw = "비밀번호에는 특수문자가 최소 1개 이상 포함되어야 합니다.";
        }
        if (msg.includes("이메일")) {
            fieldErrs.memberEmail = fieldErrs.memberEmail || "이메일 입력을 확인해주세요.";
        }
        if (msg.includes("닉네임")) {
            fieldErrs.memberNickName = fieldErrs.memberNickName || "닉네임 입력을 확인해주세요.";
        }
        if (msg.includes("출생") || msg.includes("생년")) {
            fieldErrs.memberBirthY = fieldErrs.memberBirthY || "출생 연도를 확인해주세요.";
        }
        if (msg.includes("전화") || msg.includes("휴대폰")) {
            fieldErrs.memberPhone = fieldErrs.memberPhone || "전화번호를 확인해주세요.";
        }

        return {
            message,
            fieldErrors: Object.keys(fieldErrs).length ? fieldErrs : undefined,
        };
    };

    const focusFirstError = (errors: FieldErrors) => {
        const order: FieldKey[] = [
            "memberEmail",
            "memberPw",
            "memberNickName",
            "memberName",
            "memberGender",
            "memberBirthY",
            "memberPhone",
            "agree",
        ];

        const first = order.find((k) => errors[k]);
        if (!first) return;

        if (first === "agree") {
            // 약관 섹션으로 스크롤
            document.getElementById("agree-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null;
        el?.focus?.();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setErrorMsg(null);
        setFieldErrors({});

        // ✅ 1) 프론트 검증 먼저
        const v = validateClient();
        if (!v.ok) {
            setFieldErrors(v.errors);
            setErrorMsg(v.errors.agree ?? "입력값을 확인해주세요.");
            setShowModal(true);
            focusFirstError(v.errors);
            return;
        }

        setLoading(true);

        try {
            await apiClient.post("/member/join", {
                ...form,
                // 백엔드가 Integer면 여기 숫자로 변환:
                // memberBirthY: Number(form.memberBirthY),
            });

            alert("회원가입이 완료되었습니다. 로그인 해 주세요.");
            router.push(`/login?email=${encodeURIComponent(form.memberEmail)}`);
        } catch (err) {
            console.error("회원가입 실패:", err);

            const parsed = parseServerError(err);

            setErrorMsg(parsed.message || "회원가입 중 오류가 발생했습니다.");
            setShowModal(true);

            if (parsed.fieldErrors) {
                setFieldErrors(parsed.fieldErrors);
                focusFirstError(parsed.fieldErrors);
            }
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------
    // ✅ 스타일 도우미: 에러면 빨간 테두리
    // ---------------------------
    const getInputStyle = (key: FieldKey): React.CSSProperties => {
        const hasError = Boolean(fieldErrors[key]);
        return {
            ...inputStyle,
            border: hasError ? "1px solid #ef4444" : inputStyle.border,
            boxShadow: hasError ? "0 0 0 3px rgba(239,68,68,0.18)" : "none",
        };
    };

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#050505", color: "white" }}>
            <Header />

            {/* ✅ 에러 모달 */}
            {showModal && errorMsg && (
                <Modal
                    title="회원가입 실패"
                    message={errorMsg}
                    onClose={() => setShowModal(false)}
                />
            )}

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
                    {/* 뒤로가기 */}
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

                    <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
                        T1 Membership에 가입할게요
                    </h1>

                    <p style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>
                        {form.memberEmail || "이메일"} 으로 회원가입을 진행합니다.
                    </p>

                    {/* ✅ 상단 에러(모달 말고 여기만 쓰고 싶으면 showModal 제거하면 됨) */}
                    {errorMsg && (
                        <div
                            style={{
                                marginBottom: 16,
                                fontSize: 13,
                                color: "#fca5a5",
                                lineHeight: 1.4,
                            }}
                        >
                            {errorMsg}
                        </div>
                    )}

                    {/* 이메일 */}
                    <Field label="이메일(필수)" error={fieldErrors.memberEmail}>
                        <input
                            name="memberEmail"
                            value={form.memberEmail}
                            onChange={handleChange}
                            readOnly={emailFromQuery !== ""}
                            style={getInputStyle("memberEmail")}
                        />
                    </Field>

                    {/* 비밀번호 */}
                    <Field label="비밀번호(필수)" error={fieldErrors.memberPw}>
                        <input
                            type="password"
                            name="memberPw"
                            value={form.memberPw}
                            onChange={handleChange}
                            placeholder="비밀번호를 입력해주세요 (특수문자 1개 이상)"
                            style={getInputStyle("memberPw")}
                        />
                    </Field>

                    {/* 닉네임 */}
                    <Field label="닉네임(필수)" error={fieldErrors.memberNickName}>
                        <input
                            name="memberNickName"
                            value={form.memberNickName}
                            onChange={handleChange}
                            placeholder="닉네임을 입력해주세요"
                            style={getInputStyle("memberNickName")}
                        />
                    </Field>

                    {/* 이름 */}
                    <Field label="이름(필수)" error={fieldErrors.memberName}>
                        <input
                            name="memberName"
                            value={form.memberName}
                            onChange={handleChange}
                            placeholder="이름을 입력해주세요"
                            style={getInputStyle("memberName")}
                        />
                    </Field>

                    {/* 성별 */}
                    <Field label="성별(필수)" error={fieldErrors.memberGender}>
                        <select
                            name="memberGender"
                            value={form.memberGender}
                            onChange={handleChange}
                            style={{
                                ...getInputStyle("memberGender"),
                                appearance: "none",
                                WebkitAppearance: "none",
                            }}
                        >
                            <option value="">성별을 선택해주세요</option>
                            <option value="MALE">남성</option>
                            <option value="FEMALE">여성</option>
                        </select>
                    </Field>

                    {/* 출생연도 */}
                    <Field label="출생 연도(필수)" error={fieldErrors.memberBirthY}>
                        <input
                            name="memberBirthY"
                            value={form.memberBirthY}
                            onChange={handleChange}
                            placeholder="YYYY"
                            style={getInputStyle("memberBirthY")}
                            maxLength={4}
                        />
                    </Field>

                    {/* 전화번호 */}
                    <Field label="전화번호(필수)" error={fieldErrors.memberPhone}>
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
                                style={{ ...getInputStyle("memberPhone"), flex: 1 }}
                            />
                        </div>
                    </Field>

                    {/* 약관 동의 */}
                    <div
                        id="agree-section"
                        style={{
                            marginTop: 24,
                            paddingTop: 16,
                            borderTop: "1px solid #333",
                        }}
                    >
                        <label style={checkboxRowStyle}>
                            <input type="checkbox" checked={agreeAll} onChange={toggleAgreeAll} />
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

                        {/* ✅ 약관 에러 */}
                        {fieldErrors.agree && (
                            <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>
                                {fieldErrors.agree}
                            </div>
                        )}
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

// ---------------------------
// 공통 스타일
// ---------------------------
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

function Field({
                   label,
                   error,
                   children,
               }: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, marginBottom: 6, color: "#ccc" }}>{label}</div>
            {children}
            {error && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#fca5a5" }}>{error}</div>
            )}
        </div>
    );
}

// ---------------------------
// ✅ 아주 심플한 모달
// ---------------------------
function Modal({
                   title,
                   message,
                   onClose,
               }: {
    title: string;
    message: string;
    onClose: () => void;
}) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                zIndex: 9999,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "min(520px, 100%)",
                    borderRadius: 16,
                    border: "1px solid #333",
                    background: "#0f0f0f",
                    padding: 18,
                }}
            >
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {message}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        marginTop: 14,
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "none",
                        background: "#222",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                    }}
                >
                    확인
                </button>
            </div>
        </div>
    );
}
