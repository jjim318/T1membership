// src/app/mypage/account/profile/page.tsx
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

/**
 * 백엔드에서 오는 memberImage 값(/files/xxx.jpg 같은 상대경로)을
 * 프론트에서 바로 쓸 수 있는 절대 URL로 변환해주는 헬퍼.
 *
 * - 이미 http/https 로 시작하면 그대로 사용
 * - 그 외에는 NEXT_PUBLIC_API_BASE_URL 을 앞에 붙여줌
 */
function resolveProfileUrl(raw?: string | null): string | null {
    if (!raw) return null;

    // 이미 절대 URL이면 그대로 사용
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }

    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

    // base 마지막 슬래시, raw 앞 슬래시를 고려해서 중복 슬래시 제거
    const normalizedBase = base.endsWith("/")
        ? base.slice(0, -1)
        : base;
    const normalizedRaw = raw.startsWith("/")
        ? raw
        : `/${raw}`;

    return `${normalizedBase}${normalizedRaw}`;
}

export default function ProfileEditPage() {
    const [nick, setNick] = useState("");
    const [profileUrl, setProfileUrl] = useState<string | null>(null);  // 서버 이미지(가공된 전체 URL)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);  // 새로 선택한 이미지(로컬 미리보기)
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [removeProfile, setRemoveProfile] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ===== 내 프로필 읽기 =====
    useEffect(() => {
        const load = async () => {
            try {
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<MemberInfo>>(
                    "/member/readOne"
                );
                console.log("readOne =", res.data);

                const member = res.data.result;

                // 🔥 닉네임 세팅 (MemberInfo 에 memberNickName 필드 반드시 정의되어 있어야 함)
                setNick(member.memberNickName ?? "");

                // 🔥 백엔드에서 오는 member.memberImage 를 화면에서 바로 쓸 수 있는 URL 로 변환
                const resolved = resolveProfileUrl(member.memberImage);
                setProfileUrl(resolved);

                setPreviewUrl(null);
                setProfileFile(null);
                setRemoveProfile(false);
            } catch (e: unknown) {
                console.error(e);

                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("refreshToken");
                    }
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

    // ===== 이미지 선택 =====
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

    // ===== 기본 프로필로 변경 =====
    const handleResetProfile = () => {
        setProfileFile(null);
        setPreviewUrl(null);
        setRemoveProfile(true);
    };

    // ===== 저장 (/member/profile) =====
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
            // memberEmail 은 서버에서 인증 정보로 채우는 구조면 안 보내도 됨
            // 필요하면 form.append("memberEmail", ???) 추가

            // @RequestPart("profileFile")
            if (profileFile) {
                form.append("profileFile", profileFile);
            }

            // @RequestParam("removeProfile")
            if (removeProfile) {
                form.append("removeProfile", "true");
            }

            await apiClient.post("/member/profile", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            alert("프로필이 저장되었습니다.");
            router.push("/mypage");
        } catch (e: unknown) {
            console.error(e);

            if (axios.isAxiosError(e) && e.response?.status === 401) {
                alert("로그인이 필요합니다. 다시 로그인해 주세요.");
                if (typeof window !== "undefined") {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                }
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

    // 아바타 내용
    let avatarContent: ReactNode;
    if (previewUrl) {
        // 새로 선택한 이미지가 있으면 그거부터 보여줌
        // eslint-disable-next-line @next/next/no-img-element
        avatarContent = (
            <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full rounded-full object-cover"
            />
        );
    } else if (!removeProfile && profileUrl) {
        // 저장된 프로필 이미지 (백엔드 URL 붙인 것)
        // eslint-disable-next-line @next/next/no-img-element
        avatarContent = (
            <img
                src={profileUrl}
                alt="profile"
                className="w-full h-full rounded-full object-cover"
            />
        );
    } else {
        // 이미지 없으면 닉네임 첫 글자
        avatarContent = (
            <span className="text-4xl font-bold">{nick ? nick[0] : "N"}</span>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-xl mx-auto px-6">
                {/* 프로필 + 카메라 + 기본 프로필 변경 */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-red-400 flex items-center justify-center overflow-hidden">
                            {avatarContent}
                        </div>

                        <button
                            type="button"
                            onClick={handleClickCamera}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black flex items-center justify-center border border-zinc-700 text-xs"
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
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-red-500"
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
