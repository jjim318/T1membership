// src/app/shop/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";

// =========================
// 🔥 백엔드 API BASE
// =========================
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * =========================
 * 🔥 상품 썸네일 URL 정규화
 *
 * 허용 & 처리 규칙
 * 1) http(s):// 로 시작 → 그대로 사용
 * 2) /files/xxx        → API_BASE + encodeURIComponent
 * 3) files/xxx         → API_BASE + encodeURIComponent
 * 4) 파일명만 존재     → /files/{encodeURIComponent(fileName)}
 *
 * 👉 실무에서 섞여 들어오는 데이터 전부 흡수
 * =========================
 */
function toImageSrc(raw?: string | null): string {
    if (!raw) return "";

    const url = raw.trim();
    if (!url) return "";

    // 1️⃣ 절대 URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    // 2️⃣ /files/xxx
    if (url.startsWith("/files/")) {
        const fileName = url.replace("/files/", "");
        return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
    }

    // 3️⃣ files/xxx
    if (url.startsWith("files/")) {
        const fileName = url.replace("files/", "");
        return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
    }

    // 4️⃣ 파일명만 오는 경우 (🔥 문제의 핵심)
    // ex) "T1 POP 단건결제.png"
    if (!url.includes("/")) {
        return `${API_BASE}/files/${encodeURIComponent(url)}`;
    }

    // 5️⃣ 그 외 이상한 경로 → 파일명만 추출해서 /files로 보정
    console.warn("[Shop] 예상치 못한 썸네일 경로 → 보정 처리:", url);
    const fileName = url.split("/").pop();
    if (!fileName) return "";

    return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
}

// =========================
// 타입 정의
// =========================
type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";
type ItemSellStatus = "SELL" | "SOLD_OUT" | string;
type PopPlanType = "GENERAL" | "MEMBERSHIP_ONLY" | string;

interface MemberReadOneRes {
    memberName: string;
    memberNickName: string;
    memberEmail: string;
    memberPhone: string;
    memberImage: string;
    memberGender: string;
    memberBirthY: string;
    memberRole: string;
}

interface ItemSummary {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: ItemCategory;
    itemSellStatus: ItemSellStatus;

    // 🔥 핵심
    thumbnailUrl?: string | null;

    popPlanType?: PopPlanType;
    membershipOnly?: boolean;
}

interface PageResponse<T> {
    dtoList: T[];
    total: number;
    page: number;
    size: number;
    start: number;
    end: number;
    prev: boolean;
    next: boolean;
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// =========================
// 카테고리
// =========================
type ShopCategory =
    | "상품"
    | "멤버십&이용권"
    | "T1 ZONE"
    | "[멤버십] POP"
    | "POP";

const categories: ShopCategory[] = [
    "상품",
    "멤버십&이용권",
    "T1 ZONE",
    "[멤버십] POP",
    "POP",
];

function formatPrice(price: number) {
    return price.toLocaleString("ko-KR") + "원";
}

function mapShopCategoryToItemCategory(
    cat: ShopCategory
): ItemCategory | "ALL" | null {
    switch (cat) {
        case "상품":
            return "MD";
        case "멤버십&이용권":
            return "MEMBERSHIP";
        case "[멤버십] POP":
        case "POP":
            return "POP";
        case "T1 ZONE":
            return null;
        default:
            return "ALL";
    }
}

function mapShopCategoryToPopPlanType(
    cat: ShopCategory
): PopPlanType | undefined {
    switch (cat) {
        case "[멤버십] POP":
            return "MEMBERSHIP_ONLY";
        case "POP":
            return "GENERAL";
        default:
            return undefined;
    }
}

// =========================
// 🔥 Shop Page
// =========================
export default function ShopPage() {
    const [activeCategory, setActiveCategory] =
        useState<ShopCategory>("상품");

    const [items, setItems] = useState<ItemSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const page = 0;
    const size = 12;

    // =========================
    // 관리자 여부
    // =========================
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await apiClient.get<
                    ApiResult<MemberReadOneRes>
                >("/member/readOne");

                if (
                    res.data.isSuccess &&
                    res.data.result.memberRole?.includes("ADMIN")
                ) {
                    setIsAdmin(true);
                }
            } catch {
                // 비로그인/권한 없음 → 무시
            }
        };

        fetchMe();
    }, []);

    // =========================
    // 상품 목록 로딩
    // =========================
    useEffect(() => {
        const loadItems = async () => {
            try {
                if (activeCategory === "T1 ZONE") {
                    setItems([]);
                    return;
                }

                setLoading(true);
                setErrorMsg(null);

                const params: Record<string, any> = {
                    page,
                    size,
                    sortBy: "itemNo",
                    direction: "DESC",
                    itemCategory:
                        mapShopCategoryToItemCategory(activeCategory) ??
                        "ALL",
                };

                const popPlanType =
                    mapShopCategoryToPopPlanType(activeCategory);
                if (popPlanType) params.popPlanType = popPlanType;

                const res = await apiClient.get<
                    ApiResult<PageResponse<ItemSummary>>
                >("/item", { params });

                setItems(res.data.result.dtoList);
            } catch (e) {
                console.error(e);
                setErrorMsg("상품 목록을 불러오지 못했습니다.");
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        loadItems();
    }, [activeCategory]);

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="mx-auto max-w-6xl px-6 pt-8 pb-20">
                {/* 상단 배너 */}
                <section className="mb-10">
                    <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-red-600">
                        <Image
                            src="/shop/banner-2025.png"
                            alt="2025 T1 Membership"
                            fill
                            unoptimized
                            className="object-cover"
                        />
                    </div>
                </section>

                {/* 카테고리 */}
                <section className="mb-6 border-b border-zinc-800 pb-2">
                    <div className="flex gap-6 text-sm">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`pb-2 ${
                                    cat === activeCategory
                                        ? "border-b-2 border-white font-semibold"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 상태 */}
                {loading && (
                    <div className="py-10 text-center text-sm text-gray-400">
                        상품을 불러오는 중입니다...
                    </div>
                )}

                {errorMsg && !loading && (
                    <div className="py-10 text-center text-sm text-red-400">
                        {errorMsg}
                    </div>
                )}

                {/* 상품 그리드 */}
                {!loading && !errorMsg && (
                    <>
                        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {items.length === 0 && (
                                <div className="col-span-full py-20 text-center text-sm text-gray-400">
                                    현재 표시할 상품이 없습니다.
                                </div>
                            )}

                            {items.map((item) => {
                                const imgSrc = toImageSrc(
                                    item.thumbnailUrl
                                );

                                return (
                                    <Link
                                        key={item.itemNo}
                                        href={`/shop/${item.itemNo}`}
                                        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 transition hover:border-zinc-500"
                                    >
                                        {/* 썸네일 */}
                                        <div className="relative h-56 w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                                            {imgSrc ? (
                                                <img
                                                    src={imgSrc}
                                                    alt={item.itemName}
                                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <span className="text-[11px] text-zinc-500">
                                                    이미지 없음
                                                </span>
                                            )}

                                            <div className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold">
                                                {item.itemCategory}
                                            </div>
                                        </div>

                                        {/* 텍스트 */}
                                        <div className="flex flex-1 flex-col px-4 py-3">
                                            {item.membershipOnly && (
                                                <span className="mb-1 text-[11px] text-amber-300">
                                                    멤버십 전용
                                                </span>
                                            )}

                                            <h2 className="line-clamp-2 text-sm font-semibold">
                                                {item.itemName}
                                            </h2>

                                            <div className="mt-2 text-[15px] font-bold">
                                                {formatPrice(item.itemPrice)}
                                            </div>

                                            {item.itemSellStatus ===
                                                "SOLD_OUT" && (
                                                    <div className="mt-2 text-[11px] text-gray-400">
                                                    <span className="inline-flex rounded-sm border border-gray-500 px-2 py-0.5">
                                                        품절
                                                    </span>
                                                    </div>
                                                )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </section>

                        {/* 관리자 */}
                        {isAdmin && (
                            <section className="mt-6 flex justify-end gap-3">
                                <Link
                                    href="/admin/items/new"
                                    className="rounded-full border border-emerald-400 px-6 py-2 text-xs font-semibold text-emerald-300"
                                >
                                    상품 등록
                                </Link>
                                <Link
                                    href="/admin/items"
                                    className="rounded-full border border-amber-400 px-6 py-2 text-xs font-semibold text-amber-300"
                                >
                                    상품 관리
                                </Link>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
