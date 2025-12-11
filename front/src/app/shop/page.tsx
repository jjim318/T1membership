// src/app/shop/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";

// ====== 백엔드 URL 기반 헬퍼 ======
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * 상품 썸네일용 이미지 변환
 *
 * ✅ 허용:
 *   - http:// 또는 https:// 로 시작하는 절대 URL
 *   - /files/**  →  http://localhost:8080/files/** (API_BASE 기준)
 *
 * ❌ 불허:
 *   - /shop/** 포함, 그 외 모든 상대경로
 *   → 잘못된 데이터로 보고 빈 문자열 반환
 */
function toImageSrc(raw?: string | null): string {
    if (!raw) return ""; // 이미지 없음

    const url = raw.trim();

    // 절대 URL은 그대로 사용 (혹시 외부 이미지 쓸 때 대비)
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    // ✅ 백엔드 /files/** 만 허용
    if (url.startsWith("/files")) {
        return `${API_BASE}${url}`;
    }

    // ❌ 나머지는 전부 에러로 보고 무시
    console.warn("[Shop] 썸네일은 /files/** 만 허용합니다. 잘못된 경로 =", url);
    return "";
}

// ====== 타입 정의 (백엔드 DTO에 맞춤) ======
type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";
type ItemSellStatus = "SELL" | "SOLD_OUT" | string;
type PopPlanType = "GENERAL" | "MEMBERSHIP_ONLY" | string;

interface MemberReadOneRes {
    memberName: string;
    memberNickName: string;
    memberEmail: string;
    memberPhone: string;
    memberImage: string;
    memberGender: "MALE" | "FEMALE" | string;
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

function mapShopCategoryToItemCategory(cat: ShopCategory): ItemCategory | "ALL" | null {
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

function mapShopCategoryToPopPlanType(cat: ShopCategory): PopPlanType | undefined {
    switch (cat) {
        case "[멤버십] POP":
            return "MEMBERSHIP_ONLY";
        case "POP":
            return "GENERAL";
        default:
            return undefined;
    }
}

export default function ShopPage() {
    const [activeCategory, setActiveCategory] = useState<ShopCategory>("상품");

    const [items, setItems] = useState<ItemSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    const page = 0;
    const size = 12;

    // 관리자 여부 체크
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await apiClient.get<ApiResult<MemberReadOneRes>>(
                    "/member/readOne"
                );

                if (!res.data.isSuccess) return;

                const role = res.data.result.memberRole;
                if (role && role.includes("ADMIN")) {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.warn("[Shop] /member/readOne 조회 실패:", e);
            }
        };

        fetchMe();
    }, []);

    // 카테고리 변경시 상품 다시 로딩
    useEffect(() => {
        const loadItems = async () => {
            try {
                const backendCategory = mapShopCategoryToItemCategory(activeCategory);
                const popPlanType = mapShopCategoryToPopPlanType(activeCategory);

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
                    itemCategory: backendCategory ?? "ALL",
                };

                if (popPlanType) params.popPlanType = popPlanType;

                const res = await apiClient.get<
                    ApiResult<PageResponse<ItemSummary>>
                >("/item", { params });

                setItems(res.data.result.dtoList);
            } catch (error) {
                console.error(error);
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
                {/* 상단 배너 (이건 상품이 아니라 사이트 디자인이라 public 사용) */}
                <section className="mb-10">
                    <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-red-600">
                        <Image
                            src="/shop/banner-2025.png"
                            alt="2025 T1 Membership"
                            fill
                            unoptimized // 🔥 _next/image 400 방지
                            className="object-cover"
                        />
                    </div>
                </section>

                {/* 카테고리 탭 */}
                <section className="mb-6 border-b border-zinc-800 pb-2">
                    <div className="flex gap-6 text-sm">
                        {categories.map((cat) => {
                            const isActive = cat === activeCategory;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`pb-2 ${
                                        isActive
                                            ? "text-white font-semibold border-b-2 border-white"
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 로딩/에러 */}
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
                                const imgSrc = toImageSrc(item.thumbnailUrl);

                                console.log(
                                    "[Shop] itemNo =",
                                    item.itemNo,
                                    "raw thumbnailUrl =",
                                    item.thumbnailUrl,
                                    "→ final src =",
                                    imgSrc
                                );

                                return (
                                    <Link
                                        key={item.itemNo}
                                        href={`/shop/${item.itemNo}`}
                                        className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 transition hover:border-zinc-500"
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

                                            {/* 카테고리 뱃지 */}
                                            <div className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                                {item.itemCategory}
                                            </div>
                                        </div>

                                        {/* 텍스트 영역 */}
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

                                            <div className="mt-2 text-[11px] text-gray-400">
                                                {item.itemSellStatus === "SOLD_OUT" && (
                                                    <span className="inline-flex rounded-sm border border-gray-500 px-2 py-0.5">
                                                        품절
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </section>

                        {/* 더보기 버튼 */}
                        <section className="mt-10 flex justify-center">
                            <button className="rounded-full border border-zinc-600 px-10 py-3 text-sm font-medium text-white hover:border-white">
                                더보기
                            </button>
                        </section>

                        {/* 관리자 전용 버튼 */}
                        {isAdmin && (
                            <section className="mt-4 flex justify-end gap-3">
                                <Link
                                    href="/admin/items/new"
                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400 px-6 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-300 hover:text-emerald-200"
                                >
                                    상품 등록
                                </Link>

                                <Link
                                    href="/admin/items"
                                    className="inline-flex items-center gap-2 rounded-full border border-amber-400 px-6 py-2 text-xs font-semibold text-amber-300 hover:border-amber-300 hover:text-amber-200"
                                >
                                    상품 관리
                                </Link>
                            </section>
                        )}
                    </>
                )}
            </main>

            {/* 푸터 */}
            <footer className="border-t border-zinc-900 bg-black py-10 text-xs text-zinc-400">
                <div className="mx-auto max-w-6xl px-6 space-y-1 leading-relaxed">
                    <p>상호명: T1 Membership</p>
                    <p>대표자: Yang JiMin</p>
                    <p>주소: 경기도 화성시 어딘가</p>
                    <p>이메일: t1membership@mbc.com</p>
                    <p>© 2025 T1 Membership.</p>

                    <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-zinc-500">
                        <button>이용약관</button>
                        <button>개인정보처리방침</button>
                        <button>청소년보호정책</button>
                        <button>쿠키 정책</button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
