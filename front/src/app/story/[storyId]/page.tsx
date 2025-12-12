"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

type MembershipPayType =
    | "ONE_TIME"
    | "YEARLY"
    | "RECURRING"
    | "NO_MEMBERSHIP"
    | string;

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface MemberReadOneRes {
    memberRole?: string | null;
    membershipPayType: MembershipPayType;
}

// ✅ 백엔드 StoryDetailRes(/boards/story/{boardNo})에 맞춘 타입
interface StoryDetailRes {
    boardNo: number;
    writer: string;
    title: string;
    content: string;
    locked: boolean;
    likeCount: number;
    createdDate?: string | null;
}

function useAccessGate() {
    const [loading, setLoading] = useState(true);
    const [canViewProtected, setCanViewProtected] = useState(false);

    useEffect(() => {
        const run = async () => {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("accessToken")
                    : null;

            if (!token) {
                setLoading(false);
                setCanViewProtected(false);
                return;
            }

            try {
                const res =
                    await apiClient.get<ApiResult<MemberReadOneRes>>("/member/readOne");

                if (!res.data.isSuccess || !res.data.result) {
                    setCanViewProtected(false);
                    return;
                }

                const me = res.data.result;
                const role = (me.memberRole ?? "").toString();
                const privileged =
                    role === "ADMIN" || role === "ADMIN_CONTENT" || role === "T1PROGAMER";

                // ✅ 무조건 boolean으로 고정
                const payType = (me.membershipPayType ?? "NO_MEMBERSHIP").toString();
                const memberActive = payType !== "NO_MEMBERSHIP";

                setCanViewProtected(privileged || memberActive);
            } catch {
                setCanViewProtected(false);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    return { loading, canViewProtected };
}

export default function StoryDetailPage() {
    const { storyId } = useParams<{ storyId: string }>(); // ✅ 라우트 param 이름은 그대로 사용
    const router = useRouter();

    const { loading: gateLoading, canViewProtected } = useAccessGate();

    const [data, setData] = useState<StoryDetailRes | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        // ✅ "undefined" 같은 잘못된 값이면 호출 자체를 막는다
        if (!storyId || storyId === "undefined") {
            setLoading(false);
            setErr("잘못된 스토리 주소입니다.");
            setData(null);
            return;
        }

        let alive = true;

        (async () => {
            setLoading(true);
            setErr(null);

            try {
                // ✅ 백엔드 엔드포인트에 맞춤
                const res = await apiClient.get<ApiResult<StoryDetailRes>>(
                    `/boards/story/${storyId}`,
                );

                if (!alive) return;

                if (!res.data.isSuccess || !res.data.result) {
                    setErr(res.data.resMessage || "상세를 불러오지 못했습니다.");
                    setData(null);
                    return;
                }

                setData(res.data.result);
            } catch {
                if (!alive) return;
                setErr("통신 오류");
                setData(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [storyId]);

    if (loading || gateLoading) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-3xl px-4 py-8 text-white/60 text-sm">
                    불러오는 중…
                </div>
            </main>
        );
    }

    if (err) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-red-300 text-sm">
                        {err}
                    </div>
                    <button
                        className="mt-4 rounded-full bg-white/10 border border-white/10 px-5 py-2 text-xs"
                        onClick={() => router.back()}
                    >
                        뒤로
                    </button>
                </div>
            </main>
        );
    }

    if (!data) return null;

    const locked = data.locked && !canViewProtected;

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-3xl px-4 py-8">
                <Link
                    href="/story/feed"
                    className="text-xs text-white/60 hover:text-white/90"
                >
                    ← 피드로
                </Link>

                <div className="mt-4 rounded-3xl bg-white/5 border border-white/10 p-6">
                    {/* 작성자 표시(원하면 제거 가능) */}
                    <div className="text-xs text-white/50">{data.writer}</div>

                    <h1 className="mt-2 text-xl font-bold">{data.title}</h1>

                    <div className="mt-6">
                        {locked ? (
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
                                <div className="text-3xl">🔒</div>
                                <div className="mt-3 text-sm font-semibold">
                                    멤버십 회원 전용 콘텐츠입니다.
                                </div>
                                <Link
                                    href="/membership/all"
                                    className="mt-5 inline-flex rounded-full bg-white px-6 py-2 text-xs font-bold text-black hover:bg-white/90"
                                >
                                    멤버십 가입하러 가기
                                </Link>
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap text-sm text-white/80 leading-7">
                                {data.content}
                            </div>
                        )}
                    </div>

                    {/* 좋아요 표시(원하면 제거 가능) */}
                    <div className="mt-6 text-xs text-white/50">
                        ❤️ {Number(data.likeCount ?? 0).toLocaleString()}
                    </div>
                </div>
            </div>
        </main>
    );
}
