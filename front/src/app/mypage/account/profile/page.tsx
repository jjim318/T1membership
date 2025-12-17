"use client";

import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { apiClient } from "@/lib/apiClient";
import type { ApiResult, MemberInfo } from "@/types/member";

export default function ProfileEditPage() {
    const [nick, setNick] = useState("");
    const [profileUrl, setProfileUrl] = useState<string | null>(null);  // 서버 이미지
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);  // 새로 선택한 이미지
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [removeProfile, setRemoveProfile] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // =========================
    // 내 프로필 조회
    // =========================
    useEffect(() => {
        const load = async () => {
            try {
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<MemberInfo>>(
                    "/member/readOne"
                );

                const member = res.data.result;

                setNick(member.memberNickName ?? "");
                setProfileUrl(member.memberImage ?? null);
                setPreviewUrl(null);
                setProfileFile(null);
                setRemoveProfile(false);

            } catch (e: unknown) {
                console.error(e);

                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    router.push("/login");
                    return;
                }

                setErrorMsg("회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router]);

    // =========================
    // 이미지 선택
    // =========================
    const handleClickCamera = () => {
        setRemoveProfile(false);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProfileFile(file);
        setRemoveProfile(false);

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    // =========================
    // 기본 프로필로 변경
    // =========================
    const handleResetProfile = () => {
        setProfileFile(null);
        setPreviewUrl(null);
        setRemoveProfile(true);
    };

    // =========================
    // 저장 (/member/profile)
    // =========================
    const handleSave = async () => {
        if (!nick.trim()) {
            alert("닉네임은 필수입니다.");
            return;
        }

        setSaving(true);
        setErrorMsg(null);

        try {
            const form = new FormData();

            // ModifyProfileReq
            form.append("memberNickName", nick.trim());

            // 파일이 있을 때만 추가
            if (profileFile) {
                form.append("profileFile", profileFile);
            }

            // 기본 프로필로 변경
            if (removeProfile) {
                form.append("removeProfile", "true");
            }

            // 🔥🔥🔥 핵심 수정 포인트
            // Content-Type 지정 ❌ (axios가 boundary 포함해서 자동 처리)
            await apiClient.post("/member/profile", form);

            alert("프로필이 저장되었습니다.");
            router.push("/mypage");

        } catch (e: unknown) {
            console.error(e);

            if (axios.isAxiosError(e) && e.response?.status === 401) {
                alert("로그인이 필요합니다. 다시 로그인해 주세요.");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                router.push("/login");
                return;
            }

            setErrorMsg("프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white pt-20 flex items-center justify-center">
                로딩중...
            </div>
        );
    }

    // =========================
    // 아바타 렌더링
    // =========================
    let avatarContent: ReactNode;

    if (previewUrl) {
        avatarContent = (
            <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full rounded-full object-cover"
            />
        );
    } else if (!removeProfile && profileUrl) {
        avatarContent = (
            <img
                src={profileUrl}
                alt="profile"
                className="w-full h-full rounded-full object-cover"
            />
        );
    } else {
        avatarContent = (
            <span className="text-4xl font-bold">
                {nick ? nick[0] : "N"}
            </span>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-xl mx-auto px-6">
                {/* 프로필 영역 */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-red-400 flex items-center justify-center overflow-hidden">
                            {avatarContent}
                        </div>

                        <button
                            type="button"
                            onClick={handleClickCamera}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black
                                       flex items-center justify-center border border-zinc-700 text-xs"
                        >
                            📷
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleResetProfile}
                        className="mt-3 text-xs text-zinc-300 underline underline-offset-2"
                    >
                        기본 프로필로 변경
                    </button>
                </div>

                {errorMsg && (
                    <div className="mb-4 text-xs text-red-400 text-center">
                        {errorMsg}
                    </div>
                )}

                <div className="mb-2 text-xs text-zinc-300">닉네임(필수)</div>
                <input
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg
                               px-4 py-3 text-sm outline-none focus:border-red-500"
                    placeholder="닉네임을 입력하세요"
                />

                <p className="mt-2 text-xs text-zinc-500">
                    프로필 사진과 닉네임을 다른 멤버가 볼 수 있어요
                </p>

                <button
                    onClick={handleSave}
                    disabled={saving || !nick.trim()}
                    className="w-full mt-10 py-3 rounded-lg text-sm font-semibold
                               bg-red-600 disabled:bg-red-900 disabled:text-zinc-500
                               hover:bg-red-500 transition"
                >
                    {saving ? "저장중..." : "저장하기"}
                </button>
            </div>
        </div>
    );
}
