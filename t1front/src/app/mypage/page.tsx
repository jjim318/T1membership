// src/app/mypage/page.tsx

"use client";

import {
    useEffect,
    useState,
    type FormEvent,
    type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

// 백엔드 ApiResult<T> 형태에 맞춤
// { isSuccess, resCode, resMessage, result }
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface ReadOneMemberRes {
    memberEmail: string;
    memberName: string | null;
    memberNickName: string | null;
    memberPhone: string | null;
    memberBirthY: string | null;
    memberAddress: string | null;
    profileImageUrl?: string | null;
}

interface ModifyMemberFormValues {
    memberNickName: string;
    memberPhone: string;
    memberAddress: string;
    memberPw: string;         // 새 비밀번호
    memberPwConfirm: string;  // 새 비밀번호 확인
}

export default function MyPage() {
    const router = useRouter();

    const [member, setMember] = useState<ReadOneMemberRes | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [formValues, setFormValues] = useState<ModifyMemberFormValues>({
        memberNickName: "",
        memberPhone: "",
        memberAddress: "",
        memberPw: "",
        memberPwConfirm: "",
    });

    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [removeProfile, setRemoveProfile] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // 1) 내 정보 조회
    useEffect(() => {
        const fetchMember = async () => {
            try {
                const token =
                    typeof window !== "undefined"
                        ? localStorage.getItem("accessToken")
                        : null;
                console.log("mypage에서 읽은 accessToken:", token);

                if (!token) {
                    alert("로그인이 필요합니다.");
                    router.push("/login");
                    return;
                }

                const res = await apiClient.get<ApiResult<ReadOneMemberRes>>(
                    "/member/readOne",
                );

                console.log("readOne 응답 원본:", res.data);

                const apiResult = res.data;
                const data = apiResult?.result;

                if (!data) {
                    console.warn("readOne 응답에 result가 없습니다.", apiResult);
                    setErrorMsg("회원 정보를 불러오지 못했습니다.");
                    return;
                }

                setMember(data);

                // 닉네임/전화/주소만 수정 폼에 반영
                setFormValues({
                    memberNickName: data.memberNickName ?? "",
                    memberPhone: data.memberPhone ?? "",
                    memberAddress: data.memberAddress ?? "",
                    memberPw: "",
                    memberPwConfirm: "",
                });

                if (data.profileImageUrl) {
                    setPreviewUrl(data.profileImageUrl);
                }
            } catch (error: unknown) {
                console.error("회원 정보 조회 실패:", error);

                if (axios.isAxiosError(error)) {
                    console.log("readOne 에러 status:", error.response?.status);
                    const msg =
                        (error.response?.data as { message?: string })?.message ??
                        "회원 정보를 불러오는 중 오류가 발생했습니다.";
                    setErrorMsg(msg);

                    if (error.response?.status === 401) {
                        alert("다시 로그인해주세요.");
                        router.push("/login");
                    }
                } else {
                    setErrorMsg("알 수 없는 오류가 발생했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        void fetchMember();
    }, [router]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setProfileFile(file);
        setRemoveProfile(false);

        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    // 2) 수정 (닉네임/전화/주소 + 비밀번호 + 프로필)
    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!member) return;

        setSaving(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("accessToken")
                    : null;
            if (!token) {
                alert("로그인이 필요합니다.");
                router.push("/login");
                return;
            }

            // 비밀번호 변경 유효성 체크
            if (formValues.memberPw || formValues.memberPwConfirm) {
                if (formValues.memberPw !== formValues.memberPwConfirm) {
                    setErrorMsg("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
                    setSaving(false);
                    return;
                }
                if (formValues.memberPw.length < 6) {
                    setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
                    setSaving(false);
                    return;
                }
            }

            const formData = new FormData();

            // === ModifyMemberReq에 맞춰서 전송 ===
            formData.append("memberEmail", member.memberEmail);
            formData.append("memberNickName", formValues.memberNickName);
            formData.append("memberPhone", formValues.memberPhone);
            formData.append("memberAddress", formValues.memberAddress);

            // 비밀번호를 입력한 경우에만 전송 → ModifyMemberReq.memberPw
            if (formValues.memberPw) {
                formData.append("memberPw", formValues.memberPw);
            }

            // 프로필 이미지
            if (profileFile) {
                formData.append("profileFile", profileFile);
            }

            // removeProfile은 문자열 "true"/"false"
            formData.append("removeProfile", String(removeProfile));

            const res = await apiClient.post<ApiResult<ReadOneMemberRes>>(
                "/member/modify",
                formData,
            );

            console.log("modify 응답 원본:", res.data);

            const updated = res.data?.result;
            if (!updated) {
                setErrorMsg("회원 정보가 정상적으로 저장되지 않았습니다.");
                return;
            }

            setMember(updated);
            setSuccessMsg("회원 정보가 저장되었습니다.");

            // 비밀번호 입력칸은 다시 비워줌
            setFormValues((prev) => ({
                ...prev,
                memberPw: "",
                memberPwConfirm: "",
            }));

            if (updated.profileImageUrl) {
                setPreviewUrl(updated.profileImageUrl);
            } else if (removeProfile) {
                setPreviewUrl(null);
            }
        } catch (error: unknown) {
            console.error("회원 정보 수정 실패:", error);

            if (axios.isAxiosError(error)) {
                console.log("modify 에러 status:", error.response?.status);
                console.log("modify 에러 data:", error.response?.data);

                const msg =
                    (error.response?.data as { message?: string })?.message ??
                    "회원 정보를 저장하는 중 오류가 발생했습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setSaving(false);
        }
    };

    // 3) 탈퇴
    const handleDeleteMember = async () => {
        if (!confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            return;
        }

        setDeleting(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("accessToken")
                    : null;
            if (!token) {
                alert("로그인이 필요합니다.");
                router.push("/login");
                return;
            }

            const body = {
                memberEmail: member?.memberEmail ?? "",
            };

            await apiClient.post<ApiResult<unknown>>(
                "/member/delete",
                body,
            );

            alert("회원 탈퇴가 완료되었습니다.");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("memberEmail");
            router.push("/");
        } catch (error: unknown) {
            console.error("회원 탈퇴 실패:", error);

            if (axios.isAxiosError(error)) {
                const msg =
                    (error.response?.data as { message?: string })?.message ??
                    "회원 탈퇴 중 오류가 발생했습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setDeleting(false);
        }
    };

    // ===========================
    // 렌더링
    // ===========================
    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#050505",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                내 정보 불러오는 중...
            </div>
        );
    }

    if (!member) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#050505",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                회원 정보를 찾을 수 없습니다.
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#050505",
                color: "white",
                display: "flex",
                justifyContent: "center",
                paddingTop: 80,
                paddingBottom: 80,
            }}
        >
            <div
                style={{
                    width: 520,
                    padding: 32,
                    borderRadius: 16,
                    border: "1px solid #333",
                    backgroundColor: "#111",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                }}
            >
                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        marginBottom: 16,
                    }}
                >
                    마이페이지
                </h1>
                <p style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>
                    T1 멤버십 계정 정보를 확인하고 수정할 수 있습니다.
                </p>

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
                {successMsg && (
                    <div
                        style={{
                            marginBottom: 12,
                            fontSize: 13,
                            color: "#4ade80",
                        }}
                    >
                        {successMsg}
                    </div>
                )}

                <form
                    onSubmit={handleSave}
                    style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                    {/* 프로필 */}
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: "50%",
                                border: "1px solid #333",
                                overflow: "hidden",
                                backgroundColor: "#222",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                color: "#777",
                            }}
                        >
                            {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={previewUrl}
                                    alt="profile preview"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            ) : (
                                "프로필"
                            )}
                        </div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>
                            <div style={{ marginBottom: 8 }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ fontSize: 12 }}
                                />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                    type="checkbox"
                                    checked={removeProfile}
                                    onChange={(e) => {
                                        setRemoveProfile(e.target.checked);
                                        if (e.target.checked) {
                                            setProfileFile(null);
                                            setPreviewUrl(null);
                                        }
                                    }}
                                />
                                <span>프로필 이미지 삭제</span>
                            </label>
                        </div>
                    </div>

                    {/* 이메일(읽기전용) */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            이메일 (로그인 아이디)
                        </label>
                        <input
                            value={member.memberEmail}
                            readOnly
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #333",
                                backgroundColor: "#0b0b0b",
                                color: "#777",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    {/* 이름 - 조회만 (백엔드 DTO에 없으니 수정은 안 보냄) */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            이름
                        </label>
                        <input
                            value={member.memberName ?? ""}
                            readOnly
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #333",
                                backgroundColor: "#0b0b0b",
                                color: "#777",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    {/* 닉네임 */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            닉네임
                        </label>
                        <input
                            name="memberNickName"
                            value={formValues.memberNickName}
                            onChange={handleInputChange}
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

                    {/* 전화번호 */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            전화번호
                        </label>
                        <input
                            name="memberPhone"
                            value={formValues.memberPhone}
                            onChange={handleInputChange}
                            placeholder="010-0000-0000"
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

                    {/* 출생 연도 - 조회만 */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            출생 연도
                        </label>
                        <input
                            value={member.memberBirthY ?? ""}
                            readOnly
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid #333",
                                backgroundColor: "#0b0b0b",
                                color: "#777",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    {/* 주소 */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            주소
                        </label>
                        <input
                            name="memberAddress"
                            value={formValues.memberAddress}
                            onChange={handleInputChange}
                            placeholder="서울특별시 ..."
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

                    {/* 새 비밀번호 */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            새 비밀번호
                        </label>
                        <input
                            type="password"
                            name="memberPw"
                            value={formValues.memberPw}
                            onChange={handleInputChange}
                            placeholder="변경하지 않으려면 비워두세요."
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

                    {/* 새 비밀번호 확인 */}
                    <div>
                        <label
                            style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#ccc" }}
                        >
                            새 비밀번호 확인
                        </label>
                        <input
                            type="password"
                            name="memberPwConfirm"
                            value={formValues.memberPwConfirm}
                            onChange={handleInputChange}
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
                        disabled={saving}
                        style={{
                            marginTop: 20,
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 999,
                            border: "none",
                            background: saving
                                ? "gray"
                                : "linear-gradient(90deg, #22c55e, #16a34a)",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: 14,
                            cursor: saving ? "default" : "pointer",
                        }}
                    >
                        {saving ? "저장 중..." : "정보 저장"}
                    </button>
                </form>

                <button
                    onClick={handleDeleteMember}
                    disabled={deleting}
                    style={{
                        marginTop: 16,
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: "1px solid #dc2626",
                        backgroundColor: "transparent",
                        color: "#fca5a5",
                        fontSize: 12,
                        cursor: deleting ? "default" : "pointer",
                    }}
                >
                    {deleting ? "탈퇴 처리 중..." : "회원 탈퇴"}
                </button>
            </div>
        </div>
    );
}
