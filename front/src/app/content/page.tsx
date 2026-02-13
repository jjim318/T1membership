// src/app/content/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// import Image from "next/image"; // 지금은 안 쓰니까 삭제해도 됨
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// =======================
// 타입 정의
// =======================
type ContentCategoryKey =
    | "ONWORLD_T1"
    | "T_HIND"
    | "TTIME"
    | "GREETINGS"
    | "ROAD_TO_THE_STAR"
    | "WITH_ONE_VOICE"
    | "EVENT"
    | "NOTICE"
    | "MESSAGE";

interface BannerItem {
    boardNo: number;          // 🔥 어떤 컨텐츠로 갈지
    title: string;
    subtitle: string;
    tag?: string;
    thumbnailUrl: string;     // 배너에 표시할 이미지 URL (컨텐츠 썸네일)
}

interface CategoryMeta {
    key: ContentCategoryKey;
    label: string;
    icon?: string;
}

interface ContentCardItem {
    id: number;
    title: string;
    thumbnailUrl: string;
    category: ContentCategoryKey;
    createdAtLabel?: string;
}

// 백엔드 공통 응답
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 컨텐츠 목록용 백엔드 DTO
interface BackendContent {
    boardNo: number;
    boardTitle: string;
    categoryCode: string;
    thumbnailUrl?: string | null;
    createdAt?: string | null;
}

// 🔥 배너용 백엔드 DTO (Board 기반)
interface BackendBanner {
    boardNo: number;
    title: string;
    thumbnailUrl: string;  // 예: "/files/uuid.jpg"
    bannerOrder: number;
}

// =======================
// 메타데이터 (UI용)
// =======================

const CATEGORY_LIST: CategoryMeta[] = [
    { key: "ONWORLD_T1", label: "온세상이T1", icon: "🌐" },
    { key: "T_HIND", label: "T-hind", icon: "📺" },
    { key: "TTIME", label: "T1me", icon: "⏱️" },
    { key: "GREETINGS", label: "Greetings", icon: "✉️" },
    { key: "ROAD_TO_THE_STAR", label: "Road to the Star", icon: "⭐" },
    { key: "WITH_ONE_VOICE", label: "With One Voice", icon: "🔊" },
    { key: "EVENT", label: "Event", icon: "🎉" },
    { key: "NOTICE", label: "Notice", icon: "📢" },
    { key: "MESSAGE", label: "Message from T1", icon: "📼" },
];

// 기본 더미 배너 (백엔드에서 아직 아무 것도 안 줄 때 사용)
const DEFAULT_BANNER_ITEMS: BannerItem[] = [
    {
        boardNo: 0,
        tag: "2025 Membership Greetings",
        title: "첫 번째 컨텐츠가 등록되면\n여기에 대표 배너가 뜹니다.",
        subtitle:
            "관리자 페이지에서 대표 컨텐츠를 지정하면 자동으로 교체되게 만들면 됨.",
        thumbnailUrl: "/content/banner-placeholder-1.jpg",
    },
    {
        boardNo: 0,
        tag: "T-hind",
        title: "시리즈별 컨텐츠를\n슬라이드로 보여줄 자리입니다.",
        subtitle: "슬라이는 5초 간격으로 자동 전환됩니다.",
        thumbnailUrl: "/content/banner-placeholder-2.jpg",
    },
];

// =======================
// 공통 컴포넌트
// =======================

// 🔥 배너 컴포넌트
function ContentHeroSlider({ items }: { items: BannerItem[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const router = useRouter(); // ✅ 여기 추가

    const data = items.length > 0 ? items : DEFAULT_BANNER_ITEMS;
    const active = data[activeIndex];

    useEffect(() => {
        if (data.length <= 1) return;

        const timer = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % data.length);
        }, 5000);

        return () => window.clearInterval(timer);
    }, [data.length]);

    // ✅ 썸네일 클릭 시 컨텐츠 상세로 이동
    const handleClickBanner = () => {
        if (!active.boardNo || active.boardNo === 0) return; // 더미 배너 방지
        router.push(`/content/${active.boardNo}`);
    };

    return (
        <section className="mx-auto mt-0 flex max-w-6xl flex-col gap-4 px-4 pb-10 pt-0">
            <div className="relative w-full overflow-hidden bg-black aspect-[21/8] max-h-[520px]">

                {/* 1) 전체 배경 블러 */}
                <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={active.thumbnailUrl}
                        alt={active.title}
                        className="h-full w-full object-cover blur-2xl scale-125 opacity-60"
                    />
                </div>

                {/* 2) 왼쪽 여백을 완전 검정으로 덮는 레이어 */}
                <div className="absolute inset-y-0 left-0 z-10 w-[38%] bg-black" />

                {/* 3) 오른쪽 썸네일 + 썸네일 경계에서 시작하는 그라데이션
                    👉 여기만 클릭 가능하게 처리
                */}
                <div
                    className="absolute inset-y-0 right-0 z-20 flex items-center justify-end cursor-pointer"
                    onClick={handleClickBanner} // ✅ 여기 클릭 이벤트
                >
                    <div className="relative h-full">
                        {/* 선명한 썸네일 */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={active.thumbnailUrl}
                            alt={active.title}
                            className="h-full w-auto object-cover"
                        />

                        {/* 썸네일 왼쪽 가장자리에서 시작하는 검정 → 투명 그라데이션 */}
                        <div
                            className="absolute inset-y-0 left-0 w-[260px]
                            bg-gradient-to-r from-black via-black/80 to-transparent"
                        />
                    </div>
                </div>

                {/* 4) 텍스트 영역 */}
                <div className="absolute left-0 top-[18%] z-30 px-8 md:px-12 max-w-md">
                    {active.tag && (
                        <p className="mb-3 text-xs font-medium text-sky-300">
                            {active.tag}
                        </p>
                    )}
                    <h2 className="whitespace-pre-line text-2xl font-semibold leading-snug md:text-3xl">
                        {active.title}
                    </h2>
                    <p className="mt-3 max-w-xl text-xs text-zinc-300 md:text-sm">
                        {active.subtitle}
                    </p>
                </div>

                {/* 5) 인디케이터 */}
                <div className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 gap-2">
                    {data.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            className={`h-2 w-2 rounded-full transition-all ${
                                idx === activeIndex ? "w-6 bg-white" : "bg-zinc-500"
                            }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}



function CategoryChipRow() {
    return (
        <section className="mx-auto mb-4 flex max-w-6xl flex-wrap gap-2 px-4">
            {CATEGORY_LIST.map((cat) => (
                <Link
                    key={cat.key}
                    href={`/content/category/${cat.key}`}
                    className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                >
                    {cat.icon && (
                        <span className="text-sm" aria-hidden="true">
                            {cat.icon}
                        </span>
                    )}
                    <span>{cat.label}</span>
                </Link>
            ))}
        </section>
    );
}

function ContentCardSkeleton() {
    return (
        <div className="group flex w-full flex-col gap-2">
            <div
                className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500">
                    썸네일
                </div>
            </div>
            <div className="space-y-1">
                <p className="h-[34px] overflow-hidden text-ellipsis text-[13px] font-medium text-zinc-100">
                    컨텐츠가 등록되면 여기 제목이 들어갑니다.
                </p>
                <p className="text-[11px] text-zinc-400">
                    업로드 시각 / 간단 설명 위치
                </p>
            </div>
        </div>
    );
}

interface ContentRowProps {
    category: CategoryMeta;
    items: ContentCardItem[];
    loading: boolean;
}

function ContentRow({category, items, loading}: ContentRowProps) {
    const hasItems = items.length > 0;

    // 🔥 파일 베이스 URL 세팅 (뒤에 슬래시는 제거)
    const API_BASE =
        (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

    return (
        <section className="mx-auto mb-10 max-w-6xl px-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {category.icon && (
                        <span className="text-lg" aria-hidden="true">
                            {category.icon}
                        </span>
                    )}
                    <h3 className="text-base font-semibold">{category.label}</h3>
                </div>
                <Link
                    href={`/content/category/${category.key}`}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                    전체보기 &rarr;
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loading
                    ? Array.from({ length: 4 }).map((_, idx) => (
                        <ContentCardSkeleton key={idx} />
                    ))
                    : hasItems
                        ? items.map((item) => {
                            // 🔥 절대 URL로 변환 (http로 시작 안 하면 백엔드 주소 붙이기)
                            const API_BASE_LOCAL =
                                (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
                                    /\/$/,
                                    "",
                                );

                            const resolvedThumb =
                                item.thumbnailUrl &&
                                item.thumbnailUrl.startsWith("http")
                                    ? item.thumbnailUrl
                                    : item.thumbnailUrl
                                        ? `${API_BASE_LOCAL}${item.thumbnailUrl}`
                                        : "/content/thumb-placeholder-1.jpg";

                            console.log(
                                "[CONTENT] API_BASE=",
                                API_BASE_LOCAL,
                                "thumb=",
                                item.thumbnailUrl,
                                "→",
                                resolvedThumb,
                            );

                            return (
                                <Link
                                    key={item.id}
                                    href={`/content/${item.id}`}
                                    className="group flex flex-col gap-2"
                                >
                                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={resolvedThumb}
                                            alt={item.title}
                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="h-[34px] overflow-hidden text-ellipsis text-[13px] font-medium text-zinc-100">
                                            {item.title}
                                        </p>
                                        {item.createdAtLabel && (
                                            <p className="text-[11px] text-zinc-400">
                                                {item.createdAtLabel}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            );
                        })
                        : Array.from({ length: 4 }).map((_, idx) => (
                            <ContentCardSkeleton key={idx} />
                        ))}
            </div>

            {!loading && !hasItems && (
                <p className="mt-3 text-[11px] text-zinc-500">
                    아직 등록된 컨텐츠가 없습니다. 관리자 페이지에서 컨텐츠를 등록하면
                    이 줄부터 자동으로 채워지게 만들면 됩니다.
                </p>
            )}
        </section>
    );
}

// =======================
// JWT 파싱해서 관리자 판별
// =======================

function parseJwt(token: string) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const jsonPayload = atob(padded);
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("[parseJwt] 실패", e);
        return null;
    }
}

function extractRoles(payload: any): string[] {
    if (!payload || typeof payload !== "object") return [];

    const candidate =
        payload.memberRoleList ??
        payload.roles ??
        payload.authorities ??
        payload.role ??
        payload.scope ??
        null;

    if (Array.isArray(candidate)) {
        return candidate.map(String);
    }

    if (typeof candidate === "string") {
        return candidate
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }

    return [];
}

function isContentManagerFromToken(token: string | null): boolean {
    if (!token) return false;

    const payload = parseJwt(token);
    if (!payload) return false;

    const roles = extractRoles(payload);

    const hasAdminRole = roles.some(
        (r) =>
            r === "ADMIN" ||
            r === "ADMIN_CONTENT" ||
            r === "ROLE_ADMIN" ||
            r === "ROLE_ADMIN_CONTENT",
    );

    if (hasAdminRole) return true;

    if (payload.contentManager === true) return true;

    return false;
}

function formatDateLabel(dateStr?: string | null): string | undefined {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return undefined;

    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}.${m}.${day}`;
}

// =======================
// 메인 페이지
// =======================

export default function ContentPage() {
    const router = useRouter();

    const [isContentManager, setIsContentManager] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [contentByCategory, setContentByCategory] = useState<
        Record<ContentCategoryKey, ContentCardItem[]>
    >({
        ONWORLD_T1: [],
        T_HIND: [],
        TTIME: [],
        GREETINGS: [],
        ROAD_TO_THE_STAR: [],
        WITH_ONE_VOICE: [],
        EVENT: [],
        NOTICE: [],
        MESSAGE: [],
    });

    // 🔥 배너용 상태 (/main/banner → Board 기반 컨텐츠 썸네일)
    const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);

    // 관리자 여부 체크
    useEffect(() => {
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const payload = parseJwt(token);
        console.log("[CONTENT] JWT payload =", payload);

        const ok = isContentManagerFromToken(token);
        console.log("[CONTENT] isContentManager? =", ok);
        setIsContentManager(ok);
    }, []);

    // 컨텐츠 불러오기
    useEffect(() => {
        const fetchContents = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<BackendContent[]>>(
                    "/board/content",
                );

                if (!res.data.isSuccess) {
                    setErrorMsg(res.data.resMessage || "컨텐츠 목록 로딩 실패");
                    return;
                }

                const list = res.data.result ?? [];
                console.log("[CONTENT] backend list =", list);

                const map: Record<ContentCategoryKey, ContentCardItem[]> = {
                    ONWORLD_T1: [],
                    T_HIND: [],
                    TTIME: [],
                    GREETINGS: [],
                    ROAD_TO_THE_STAR: [],
                    WITH_ONE_VOICE: [],
                    EVENT: [],
                    NOTICE: [],
                    MESSAGE: [],
                };

                list.forEach((c) => {
                    const raw = c.categoryCode?.toUpperCase();
                    const key = (raw as ContentCategoryKey) || "NOTICE";

                    if (!(key in map)) {
                        console.warn("[CONTENT] unknown categoryCode =", raw);
                        return;
                    }

                    const item: ContentCardItem = {
                        id: c.boardNo,
                        title: c.boardTitle,
                        thumbnailUrl: c.thumbnailUrl || "/content/no-thumb.jpg",
                        category: key,
                        createdAtLabel: formatDateLabel(c.createdAt),
                    };

                    map[key].push(item);
                });

                setContentByCategory(map);
            } catch (e) {
                console.error("[CONTENT] load error", e);
                setErrorMsg("컨텐츠 목록 호출 실패");
            } finally {
                setLoading(false);
            }
        };

        fetchContents();
    }, []);

    // 🔥 배너 불러오기 (/main/banner → Board 기반 배너 컨텐츠)
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await apiClient.get<ApiResult<BackendBanner[]>>(
                    "/main/banner",
                );

                if (!res.data.isSuccess) {
                    console.warn(
                        "[BANNER] load fail:",
                        res.data.resMessage || "배너 로딩 실패",
                    );
                    return;
                }

                const list = res.data.result ?? [];
                const API_BASE =
                    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

                const mapped: BannerItem[] = list
                    .sort((a, b) => a.bannerOrder - b.bannerOrder)
                    .map((b) => {
                        const raw =
                            b.thumbnailUrl || "/content/banner-placeholder-1.jpg";
                        const resolved = raw.startsWith("http")
                            ? raw
                            : `${API_BASE}${raw}`;

                        return {
                            boardNo: b.boardNo,
                            title: b.title,
                            subtitle: "", // 필요하면 요약 필드 추가해서 채우면 됨
                            tag: undefined,
                            thumbnailUrl: resolved,
                        };
                    });

                setBannerItems(mapped);
            } catch (e) {
                console.error("[BANNER] load error", e);
                // 배너는 없어도 치명적이진 않으니까 기본값 사용
            }
        };

        fetchBanners();
    }, []);

    return (
        <div className="min-h-screen bg-black text-zinc-50">
            <main className="pb-16 pt-0">
                {/* 관리자만 보이는 상단 버튼들 */}
                {isContentManager && (
                    <section className="mx-auto flex max-w-6xl justify-end gap-2 px-4 pb-2">

                        {/* ✅ 컨텐츠 수정/삭제 버튼 (맨 오른쪽에 위치) */}
                        <button
                            type="button"
                            onClick={() => router.push("/admin/content/manage")}
                            className="rounded-full bg-zinc-700 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-600"
                        >
                            컨텐츠 수정/삭제
                        </button>

                        {/* 배너 수정 버튼 */}
                        <button
                            type="button"
                            onClick={() => router.push("/admin/banner")}
                            className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
                        >
                            배너 수정
                        </button>

                        {/* 컨텐츠 등록 버튼 */}
                        <button
                            type="button"
                            onClick={() => router.push("/admin/content")}
                            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                        >
                            컨텐츠 등록
                        </button>
                    </section>
                )}

                {/* 상단 자동 배너 (백엔드에서 오면 그걸로, 아니면 기본값으로) */}
                <ContentHeroSlider items={bannerItems} />

                {/* 카테고리 칩 */}
                <CategoryChipRow />

                {/* 에러 메시지 */}
                {errorMsg && (
                    <div className="mx-auto max-w-6xl px-4 pb-4 text-[11px] text-red-400">
                        {errorMsg}
                    </div>
                )}

                {/* 카테고리별 한 줄 섹션 */}
                {CATEGORY_LIST.map((cat) => (
                    <ContentRow
                        key={cat.key}
                        category={cat}
                        items={contentByCategory[cat.key]}
                        loading={loading}
                    />
                ))}
            </main>
        </div>
    );
}
