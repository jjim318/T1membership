// src/app/admin/mypage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

interface AdminInfo {
    memberEmail: string;
    memberName?: string;
    memberNickName?: string;
    profileImageUrl?: string | null;
    memberRole?: string;
    memberPhone?: string;
    createdAt?: string;
}

function formatDate(value?: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}.${m}.${day}`;
}

export default function AdminMyPage() {
    const router = useRouter();
    const [info, setInfo] = useState<AdminInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiClient.get("/member/readOne");
                const data: AdminInfo =
                    res.data?.result ?? res.data?.data ?? null;
                setInfo(data);
            } catch (e) {
                if (axios.isAxiosError(e)) {
                    console.error("[AdminMyPage] 로드 실패", e.response?.data ?? e);
                } else {
                    console.error("[AdminMyPage] 로드 실패", e);
                }
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    if (loading) {
        return (
            <div className="text-zinc-400 text-sm">
                관리자 정보 불러오는 중...
            </div>
        );
    }

    if (!info) {
        return (
            <div className="text-red-400 text-sm">
                관리자 정보를 불러오지 못했습니다.
            </div>
        );
    }

    const displayName = info.memberNickName ?? info.memberName ?? "관리자";

    return (
        <div className="text-white space-y-8">
            {/* 상단 타이틀 영역 */}
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">관리자 마이페이지</h2>
                <p className="text-xs md:text-sm text-zinc-400">
                    T1 MEMBERSHIP 관리자 계정 정보를 확인하고 수정할 수 있습니다.
                </p>
            </div>

            {/* 상단 프로필 + 계정 정보 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 프로필 카드 */}
                <section className="bg-zinc-900 rounded-2xl p-5 md:p-6 flex gap-4 items-center">
                    <div className="flex-shrink-0">
                        <img
                            src={info.profileImageUrl ?? "/icons/user.PNG"}
                            alt="관리자 프로필"
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-red-500 object-cover"
                        />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl font-semibold truncate">
                                {displayName}
                            </span>
                            <span className="px-2 py-[2px] rounded-full border border-red-500 text-[10px] md:text-xs text-red-400">
                                {info.memberRole ?? "ADMIN"}
                            </span>
                        </div>
                        <div className="text-xs md:text-sm text-zinc-400 truncate">
                            {info.memberEmail}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                            관리자 권한으로 T1 MEMBERSHIP 서비스를 운영 중입니다.
                        </div>
                    </div>
                </section>

                {/* 계정 정보 카드 */}
                <section className="bg-zinc-900 rounded-2xl p-5 md:p-6">
                    <h3 className="text-sm font-semibold mb-4 text-zinc-200">
                        계정 정보
                    </h3>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500 min-w-[70px]">
                                이름
                            </dt>
                            <dd className="text-zinc-100 text-right flex-1 break-words">
                                {info.memberName ?? "-"}
                            </dd>
                        </div>

                        <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500 min-w-[70px]">
                                닉네임
                            </dt>
                            <dd className="text-zinc-100 text-right flex-1 break-words">
                                {info.memberNickName ?? "-"}
                            </dd>
                        </div>

                        <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500 min-w-[70px]">
                                휴대폰
                            </dt>
                            <dd className="text-zinc-100 text-right flex-1 break-words">
                                {info.memberPhone ?? "-"}
                            </dd>
                        </div>

                        <div className="flex justify-between gap-4">
                            <dt className="text-zinc-500 min-w-[70px]">
                                가입일
                            </dt>
                            <dd className="text-zinc-100 text-right flex-1 break-words">
                                {formatDate(info.createdAt)}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>

            {/* 하단 액션/설정 영역 */}
            <section className="bg-zinc-900 rounded-2xl p-5 md:p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-200">
                    계정 관리
                </h3>
                <p className="text-xs md:text-sm text-zinc-400">
                    비밀번호 변경 및 관리자 정보 수정은 아래 메뉴에서 진행할 수 있습니다.
                </p>

                <div className="flex flex-wrap gap-3 mt-2">
                    <button
                        type="button"
                        onClick={() => {
                            // 나중에 실제 관리자 정보 수정 페이지 경로로 변경
                            router.push("/mypage/edit");
                        }}
                        className="
                            px-4 py-2
                            rounded-lg
                            bg-red-600 hover:bg-red-700
                            text-sm font-semibold
                        "
                    >
                        정보 수정
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            // 나중에 별도 비밀번호 변경 페이지 만들면 그쪽으로
                            router.push("/mypage/password");
                        }}
                        className="
                            px-4 py-2
                            rounded-lg
                            bg-zinc-700 hover:bg-zinc-600
                            text-sm font-semibold
                        "
                    >
                        비밀번호 변경
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            alert("2차 인증 기능은 추후 추가 예정입니다.");
                        }}
                        className="
                            px-4 py-2
                            rounded-lg
                            border border-zinc-700
                            text-xs md:text-sm
                            text-zinc-300
                            hover:bg-zinc-800
                        "
                    >
                        2차 인증 관리 (준비중)
                    </button>
                </div>
            </section>
        </div>
    );
}
