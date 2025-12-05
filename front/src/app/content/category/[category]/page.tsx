"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 백엔드에서 /board/content 로 주는 애랑 맞춰야 함
interface BackendContent {
    boardNo: number;
    boardTitle: string;
    categoryCode: string;          // 예: "ONWORLD_T1"
    thumbnailUrl?: string | null;  // 예: "/files/uuid.png"
    duration?: string | null;      // "12:34" 이런거 있을 수도 있음
    createdAt?: string | null;     // ISO 문자열
}

// 화면에 쓸 카드용
interface ContentCard {
    id: number;
    title: string;
    thumbnailUrl: string;
    createdAt?: string | null;
    duration?: string | null;
}

// 카테고리 슬러그 → 화면에 보여줄 이름
const CATEGORY_NAME_MAP: Record<string, string> = {
    ONWORLD_T1: "온세상이T1",
    T_HIND: "T-hind",
    TTIME: "T1me",
    GREETINGS: "Greetings",
    ROAD_TO_THE_STAR: "Road to the Star",
    WITH_ONE_VOICE: "With One Voice",
    EVENT: "Event",
    NOTICE: "Notice",
    MESSAGE: "Message from T1",
};

// "n분 전 / n시간 전 / n일 전..." 포맷
function formatTimeAgo(isoString: string | null | undefined): string {
    if (!isoString) return "";

    const created = new Date(isoString);
    if (Number.isNaN(created.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    if (diffMs < 0) return "방금 전";

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffMin < 1) return "방금 전";
    if (diffHour < 1) return `${diffMin}분 전`;
    if (diffDay < 1) return `${diffHour}시간 전`;
    if (diffWeek < 1) return `${diffDay}일 전`;
    if (diffMonth < 1) return `${diffWeek}주 전`;
    if (diffYear < 1) return `${diffMonth}달 전`;
    return `${diffYear}년 전`;
}

export default function ContentCategoryPage() {
    const params = useParams<{ category: string }>();
    const categorySlug = params.category; // 예: "ONWORLD_T1"
    const decodedSlug = decodeURIComponent(categorySlug);

    const displayName =
        CATEGORY_NAME_MAP[decodedSlug] ?? decodedSlug;

    const [items, setItems] = useState<ContentCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 파일 베이스 URL
    const API_BASE =
        (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

    useEffect(() => {
        const fetchCategoryContents = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                // 🔥 여기! 이제 /main/contents/by-category 말고
                //     이미 있는 /board/content 를 불러온다
                const res = await apiClient.get<ApiResult<BackendContent[]>>(
                    "/board/content"
                );

                if (!res.data.isSuccess) {
                    throw new Error(res.data.resMessage || "컨텐츠 조회 실패");
                }

                const list = res.data.result ?? [];

                // 🔥 카테고리 코드로 필터링 (대소문자 안전하게)
                const filtered = list.filter((c) => {
                    const code = (c.categoryCode || "").toUpperCase();
                    return code === decodedSlug.toUpperCase();
                });

                const cards: ContentCard[] = filtered.map((c) => {
                    const rawThumb = c.thumbnailUrl ?? "/content/no-thumb.jpg";
                    const resolvedThumb =
                        rawThumb.startsWith("http")
                            ? rawThumb
                            : `${API_BASE}${rawThumb}`;

                    return {
                        id: c.boardNo,
                        title: c.boardTitle,
                        thumbnailUrl: resolvedThumb,
                        createdAt: c.createdAt ?? undefined,
                        duration: c.duration ?? undefined,
                    };
                });

                setItems(cards);
            } catch (err: any) {
                console.error("[CATEGORY] load error", err);
                setErrorMsg(err?.message || "카테고리 컨텐츠 조회 실패");
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryContents();
    }, [decodedSlug, API_BASE]);

    const totalCount = items.length;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* 헤더 높이에 맞춰서 여백 조정 */}
            <div className="pt-24" />

            <main className="max-w-6xl mx-auto px-4 pb-20">
                {/* 상단 타이틀 */}
                <header className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600/80">
                            <span className="text-lg">📺</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {displayName}
                        </h1>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                        {totalCount > 0
                            ? `${totalCount}개 콘텐츠`
                            : "등록된 콘텐츠가 없습니다."}
                    </p>
                </header>

                {loading && (
                    <div className="mt-10 text-center text-zinc-400">
                        불러오는 중입니다…
                    </div>
                )}

                {!loading && errorMsg && (
                    <div className="mt-10 text-center text-red-500">
                        {errorMsg}
                    </div>
                )}

                {!loading && !errorMsg && (
                    <>
                        {items.length === 0 ? (
                            <div className="mt-10 text-center text-zinc-400">
                                아직 이 카테고리에 등록된 영상이 없습니다.
                            </div>
                        ) : (
                            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map((item) => {
                                    const timeAgo = formatTimeAgo(item.createdAt ?? null);

                                    const detailHref = `/content/${item.id}`;

                                    return (
                                        <Link
                                            key={item.id}
                                            href={detailHref}
                                            className="group"
                                        >
                                            <article className="flex flex-col">
                                                <div className="relative w-full overflow-hidden rounded-xl bg-zinc-900">
                                                    <div className="relative w-full aspect-video">
                                                        <img
                                                            src={item.thumbnailUrl}
                                                            alt={item.title}
                                                            className="absolute inset-0 h-full w-full object-cover"
                                                        />

                                                        {item.duration && (
                                                            <div
                                                                className="absolute right-2 bottom-2 rounded-md bg-black/80 px-2 py-1 text-xs font-medium text-white">
                                                                {item.duration}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex flex-col gap-1">
                                                    <h2 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-white">
                                                        {item.title}
                                                    </h2>
                                                    {timeAgo && (
                                                        <span className="text-xs text-zinc-400">
                                                            {timeAgo}
                                                        </span>
                                                    )}
                                                </div>
                                            </article>
                                        </Link>
                                    );
                                })}
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
