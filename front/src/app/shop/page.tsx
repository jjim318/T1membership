// src/app/shop/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";

// ====== 타입 정의 (백엔드 DTO에 맞춤) ======

// 백엔드 ItemCategory enum
type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";

// 백엔드 ItemSellStatus → 지금은 SELL 이라서 string 포함
type ItemSellStatus = "SELL" | "SOLDOUT" | string;

// 🔥 백엔드 PopPlanType enum과 맞춤 (필요한 값만)
type PopPlanType = "GENERAL" | "MEMBERSHIP_ONLY" | string;

// 상품 요약
interface ItemSummary {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: "MD" | "MEMBERSHIP" | "POP" | "ALL";
    itemSellStatus: ItemSellStatus;

    thumbnailUrl?: string | null;

    // 🔥 선택: 백엔드에서 보내주면 자동 매핑됨
    popPlanType?: PopPlanType;
    membershipOnly?: boolean;
}

// PageResponseDTO<SearchAllItemRes>
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

// ApiResult<T> – 형님 백 구조에 맞춤
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// ====== 프론트 전용 타입 (탭 카테고리) ======
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

// 탭 -> 백엔드 ItemCategory 매핑
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
            // 아직 별도 카테고리 없으니까 일단 전체 or null
            return null;
        default:
            return "ALL";
    }
}

// 🔥 탭 -> 백엔드 PopPlanType 매핑
function mapShopCategoryToPopPlanType(cat: ShopCategory): PopPlanType | undefined {
    switch (cat) {
        case "[멤버십] POP":
            // 멤버십 전용 POP
            return "MEMBERSHIP_ONLY";
        case "POP":
            // 일반 POP
            return "GENERAL";
        default:
            // 다른 탭은 POP 플랜 타입 안 보냄
            return undefined;
    }
}

export default function ShopPage() {
    const [activeCategory, setActiveCategory] = useState<ShopCategory>("상품");

    const [items, setItems] = useState<ItemSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // TODO: 페이지네이션 쓰고 싶으면 page 상태도 추가
    const page = 0;
    const size = 12;

    // 카테고리가 바뀔 때마다 백엔드에서 다시 조회
    useEffect(() => {
        const loadItems = async () => {
            try {
                // T1 ZONE 은 아직 데이터 없다고 가정 → 바로 빈 배열
                const backendCategory = mapShopCategoryToItemCategory(activeCategory);
                const popPlanType = mapShopCategoryToPopPlanType(activeCategory);

                if (activeCategory === "T1 ZONE") {
                    setItems([]);
                    return;
                }

                setLoading(true);
                setErrorMsg(null);

                // 🔥 params 객체를 먼저 만든 다음, popPlanType이 있을 때만 추가
                const params: Record<string, any> = {
                    page,
                    size,
                    sortBy: "itemNo",
                    direction: "DESC",
                    itemCategory: backendCategory ?? "ALL",
                };

                if (popPlanType) {
                    params.popPlanType = popPlanType;
                }

                const res = await apiClient.get<ApiResult<PageResponse<ItemSummary>>>(
                    "/item",
                    { params }
                );

                // 결과는 항상 res.data.result 안에 있음
                const pageData = res.data.result;

                // dtoList로 아이템 목록 설정
                setItems(pageData.dtoList);

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
                {/* 상단 배너 */}
                <section className="mb-10">
                    <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-red-600">
                        <Image
                            src="/shop/banner-2025.png"
                            alt="2025 T1 Membership"
                            fill
                            className="object-cover"
                        />
                    </div>
                </section>

                {/* 카테고리 탭 영역 (정렬 버튼 제거) */}
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

                {/* 로딩/에러 상태 표시 */}
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
                                console.log(
                                    "[DEBUG] itemCategory =",
                                    item.itemCategory,
                                    "popPlanType =",
                                    item.popPlanType,
                                    "for itemNo =",
                                    item.itemNo
                                );

                                return (
                                    <Link
                                        key={item.itemNo}
                                        href={`/shop/${item.itemNo}`} // ★ 상세 페이지로 이동
                                        className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 transition hover:border-zinc-500"
                                    >
                                        {/* 썸네일*/}
                                        <div className="relative h-56 w-full bg-zinc-900">
                                            <Image
                                                src={
                                                    item.thumbnailUrl ||
                                                    "/shop/placeholder.png"
                                                } // ★ 백에서 온 썸네일 우선 사용
                                                alt={item.itemName}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                            />

                                            {/* 좌상단 카테고리 뱃지 */}
                                            <div className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                                {item.itemCategory === "MD" && "MD"}
                                                {item.itemCategory === "MEMBERSHIP" &&
                                                    "MEMBERSHIP"}
                                                {item.itemCategory === "POP" && "POP"}
                                            </div>
                                        </div>

                                        {/* 텍스트 영역 */}
                                        <div className="flex flex-1 flex-col px-4 py-3">
                                            {/* 상단 작은 라벨 : 지금은 MD 상품에만 붙음 */}
                                            {(item.membershipOnly) && (
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

                                            {/* 하단 품절 태그 */}
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

                        {/* 더보기 버튼 (페이지네이션 연동은 나중에) */}
                        <section className="mt-10 flex justify-center">
                            <button className="rounded-full border border-zinc-600 px-10 py-3 text-sm font-medium text-white hover:border-white">
                                더보기
                            </button>
                        </section>
                    </>
                )}
            </main>

            {/* 하단 푸터 */}
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
