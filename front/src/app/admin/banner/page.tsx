// src/app/admin/banner/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// 공통 ApiResult
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 컨텐츠 목록 응답 (이미 /board/content 에서 쓰는 DTO랑 맞춰서)
interface BackendContent {
    boardNo: number;
    boardTitle: string;
    categoryCode: string;
    thumbnailUrl?: string | null;
    createdAt?: string | null;
}

// 배너 응답 (백엔드 /admin/banner, /main/banner 기준)
interface BackendBanner {
    boardNo: number;
    title: string;
    thumbnailUrl: string;
    bannerOrder: number;
}

// 화면에서 사용할 타입
interface BannerItem {
    boardNo: number;
    title: string;
    thumbnailUrl: string;
    bannerOrder: number; // 1,2,3...
}

export default function AdminBannerPage() {
    const router = useRouter();

    const [allContents, setAllContents] = useState<BackendContent[]>([]);
    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const API_BASE =
        (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

    // 초기 로딩: 컨텐츠 전체 + 현재 배너 설정
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // 컨텐츠 목록 + 현재 배너를 동시에 호출
                const [contentRes, bannerRes] = await Promise.all([
                    apiClient.get<ApiResult<BackendContent[]>>("/board/content"),
                    apiClient.get<ApiResult<BackendBanner[]>>("/admin/banner"),
                ]);

                // 1) 컨텐츠 목록 세팅
                if (contentRes.data.isSuccess) {
                    setAllContents(contentRes.data.result ?? []);
                } else {
                    console.warn(
                        "[BANNER-ADMIN] 컨텐츠 목록 실패:",
                        contentRes.data.resMessage,
                    );
                    setAllContents([]);
                }

                // 2) 현재 배너 세팅
                if (bannerRes.data.isSuccess) {
                    const list = bannerRes.data.result ?? [];
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
                                thumbnailUrl: resolved,
                                bannerOrder: b.bannerOrder,
                            };
                        });
                    setBanners(mapped);
                } else {
                    console.warn(
                        "[BANNER-ADMIN] 배너 목록 실패:",
                        bannerRes.data.resMessage,
                    );
                    setBanners([]);
                }
            } catch (e) {
                console.error("[BANNER-ADMIN] 초기 로딩 오류", e);
                setAllContents([]);
                setBanners([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [API_BASE]);

    // 해당 컨텐츠가 현재 배너로 선택됐는지 확인
    const findBannerIndex = (boardNo: number) =>
        banners.findIndex((b) => b.boardNo === boardNo);

    const isSelectedBanner = (boardNo: number) =>
        findBannerIndex(boardNo) !== -1;

    // 배너 선택/해제
    const toggleBanner = (content: BackendContent) => {
        setBanners((prev) => {
            const idx = prev.findIndex((b) => b.boardNo === content.boardNo);
            if (idx !== -1) {
                // 이미 선택됨 → 해제
                const clone = [...prev];
                clone.splice(idx, 1);
                // 순서 다시 1부터 정렬해도 됨
                return clone.map((b, i) => ({
                    ...b,
                    bannerOrder: i + 1,
                }));
            } else {
                // 새로 선택
                const raw = content.thumbnailUrl || "/content/banner-placeholder-1.jpg";
                const resolved = raw.startsWith("http")
                    ? raw
                    : `${API_BASE}${raw}`;

                const nextOrder = prev.length + 1;
                return [
                    ...prev,
                    {
                        boardNo: content.boardNo,
                        title: content.boardTitle,
                        thumbnailUrl: resolved,
                        bannerOrder: nextOrder,
                    },
                ];
            }
        });
    };

    // 순서 변경 (위/아래)
    const moveBanner = (index: number, direction: "up" | "down") => {
        setBanners((prev) => {
            const arr = [...prev];
            const targetIndex = direction === "up" ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= arr.length) return prev;

            const tmp = arr[index];
            arr[index] = arr[targetIndex];
            arr[targetIndex] = tmp;

            // 순서 다시 매기기
            return arr.map((b, i) => ({
                ...b,
                bannerOrder: i + 1,
            }));
        });
    };

    // 순서 저장
    const handleSaveOrder = async () => {
        try {
            setSaving(true);
            const payload = banners.map((b, idx) => ({
                boardNo: b.boardNo,
                bannerOrder: idx + 1,
            }));
            await apiClient.put("/admin/banner/order", payload);
            alert("배너 설정이 저장되었습니다.");
        } catch (e) {
            console.error("[BANNER-ADMIN] 저장 오류", e);
            alert("배너 설정 저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
                {/* 헤더 */}
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold">메인 배너 관리</h1>
                    <button
                        onClick={() => router.push("/content")}
                        className="text-sm text-zinc-400 hover:text-zinc-200"
                    >
                        ← 컨텐츠 메인으로 돌아가기
                    </button>
                </div>

                {/* 설명 */}
                <section className="mb-6 rounded-xl bg-zinc-900 p-4 text-xs text-zinc-300">
                    <p className="mb-1">
                        · 메인 상단 슬라이더 배너는 <b>컨텐츠 썸네일</b>을 그대로 사용합니다.
                    </p>
                    <p className="mb-1">
                        · 아래 목록에서 배너로 사용할 컨텐츠를 선택하고, 순서를 조정한 뒤{" "}
                        <b>“배너 설정 저장”</b> 버튼을 눌러 주세요.
                    </p>
                    <p> · 이미지 업로드는 컨텐츠 등록 화면에서만 진행됩니다.</p>
                </section>

                {loading ? (
                    <p className="text-xs text-zinc-400">불러오는 중…</p>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* 왼쪽: 컨텐츠 목록 */}
                        <section className="rounded-xl bg-zinc-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold">
                                    컨텐츠 목록 (배너로 사용할 컨텐츠 선택)
                                </h2>
                            </div>

                            {allContents.length === 0 ? (
                                <p className="text-xs text-zinc-400">
                                    등록된 컨텐츠가 없습니다.
                                </p>
                            ) : (
                                <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1 text-xs">
                                    {allContents.map((c) => {
                                        const selectedIndex = findBannerIndex(
                                            c.boardNo,
                                        );
                                        const isSelected = selectedIndex !== -1;

                                        const rawThumb =
                                            c.thumbnailUrl || "/content/no-thumb.jpg";
                                        const resolvedThumb = rawThumb.startsWith(
                                            "http",
                                        )
                                            ? rawThumb
                                            : `${API_BASE}${rawThumb}`;

                                        return (
                                            <div
                                                key={c.boardNo}
                                                className={`flex items-center gap-3 rounded-lg border px-2 py-2 ${
                                                    isSelected
                                                        ? "border-red-500 bg-zinc-800/70"
                                                        : "border-zinc-700 bg-zinc-900"
                                                }`}
                                            >
                                                <div className="relative h-12 w-20 overflow-hidden rounded bg-zinc-900">
                                                    <Image
                                                        src={resolvedThumb}
                                                        alt={c.boardTitle}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 overflow-hidden text-xs">
                                                    <div className="truncate text-zinc-100">
                                                        {c.boardTitle}
                                                    </div>
                                                    <div className="mt-0.5 text-[10px] text-zinc-400">
                                                        #{c.boardNo} /{" "}
                                                        {c.categoryCode || "카테고리 없음"}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="mt-0.5 text-[10px] text-red-400">
                                                            배너{" "}
                                                            {selectedIndex + 1}번으로
                                                            사용 중
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleBanner(c)}
                                                    className={`rounded px-2 py-1 text-[11px] font-semibold ${
                                                        isSelected
                                                            ? "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                                                            : "bg-red-600 text-white hover:bg-red-500"
                                                    }`}
                                                >
                                                    {isSelected ? "해제" : "배너로"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* 오른쪽: 현재 배너 순서 */}
                        <section className="rounded-xl bg-zinc-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold">
                                    현재 배너 순서
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleSaveOrder}
                                    disabled={saving}
                                    className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    {saving ? "저장 중..." : "배너 설정 저장"}
                                </button>
                            </div>

                            {banners.length === 0 ? (
                                <p className="text-xs text-zinc-400">
                                    선택된 배너가 없습니다. 왼쪽에서 컨텐츠를 선택해 주세요.
                                </p>
                            ) : (
                                <ul className="space-y-3 text-xs">
                                    {banners.map((b, index) => (
                                        <li
                                            key={b.boardNo}
                                            className="flex items-center gap-3 rounded-lg bg-zinc-800 p-2"
                                        >
                                            <div className="relative h-14 w-24 overflow-hidden rounded bg-zinc-900">
                                                <Image
                                                    src={b.thumbnailUrl}
                                                    alt={b.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-[11px] text-zinc-400">
                                                    배너 {index + 1}번 / 게시글 #
                                                    {b.boardNo}
                                                </div>
                                                <div className="truncate text-zinc-100">
                                                    {b.title}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveBanner(index, "up")
                                                    }
                                                    className="rounded bg-zinc-700 px-2 py-1 text-[11px] hover:bg-zinc-600"
                                                >
                                                    ↑ 위로
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveBanner(index, "down")
                                                    }
                                                    className="rounded bg-zinc-700 px-2 py-1 text-[11px] hover:bg-zinc-600"
                                                >
                                                    ↓ 아래로
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
