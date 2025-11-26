// src/app/shop/[itemNo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

// ===== 타입 정의 =====
type ItemCategory = "MD" | "MEMBERSHIP" | "POP" | "ALL";
type ItemSellStatus = "SELL" | "SOLD_OUT" | string;

interface ExistingImageDTO {
    fileName: string;
    sortOrder: number | null;
}

interface ItemDetail {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: ItemCategory;
    itemSellStatus: ItemSellStatus;
    images: ExistingImageDTO[];
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

export default function ShopDetailPage() {
    const params = useParams<{ itemNo: string }>();
    const router = useRouter();

    const itemNo = Number(params?.itemNo);

    const [item, setItem] = useState<ItemDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 상세 배송 옵션 아코디언 열림/닫힘
    const [showShippingDetail, setShowShippingDetail] = useState(false);

    // 장바구니 버튼 상태
    const [cartLoading, setCartLoading] = useState(false);
    const [cartError, setCartError] = useState<string | null>(null);

    // ===== 데이터 로딩 =====
    useEffect(() => {
        if (!itemNo || Number.isNaN(itemNo)) {
            setErrorMsg("잘못된 상품 번호입니다.");
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<ItemDetail>>(
                    `/item/${itemNo}`
                );
                setItem(res.data.result);
            } catch (e) {
                console.error(e);
                setErrorMsg("상품 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [itemNo]);

    // ===== 로딩/에러 분기 =====
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                로딩 중...
            </div>
        );
    }

    if (errorMsg || !item) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
                <p>{errorMsg ?? "상품 정보를 찾을 수 없습니다."}</p>
                <Link href="/shop" className="text-sm text-zinc-400 underline">
                    ← SHOP으로 돌아가기
                </Link>
            </div>
        );
    }

    // ===== 이미지 정리 =====
    const sortedImages = [...(item.images ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

    // 썸네일
    const rawThumb = sortedImages[0]?.fileName ?? "/shop/placeholder.png";
    const thumbnailUrl =
        rawThumb.startsWith("http") || rawThumb.startsWith("/")
            ? rawThumb
            : `/${rawThumb}`;

    // 상세 설명용 이미지 (썸네일 제외)
    const detailImages = sortedImages.slice(1).map((img) => {
        const raw = img.fileName;
        const url =
            raw.startsWith("http") || raw.startsWith("/")
                ? raw
                : `/${raw}`;
        return { ...img, url };
    });

    const isSoldOut =
        item.itemSellStatus === "SOLD_OUT" || item.itemStock <= 0;
    const isMembershipOnly = item.itemCategory === "MEMBERSHIP";

    // ===== 장바구니 담기 로직 =====
    const handleAddToCart = async () => {
        if (isSoldOut || cartLoading) return;

        try {
            setCartLoading(true);
            setCartError(null);

            await apiClient.post<ApiResult<unknown>>("/cart", {
                itemNo: item.itemNo,
                quantity: 1,
            });

            router.push("/shop/cart");
        } catch (e) {
            console.error(e);
            setCartError("장바구니 담기에 실패했습니다.");
            alert("장바구니 담기에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setCartLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* 내용이 고정 푸터에 가리지 않도록 아래쪽 패딩 넉넉히 */}
            <main className="mx-auto max-w-4xl px-4 pb-28 pt-6">
                {/* 상단: 뒤로가기 + 공유 */}
                <header className="mb-4 flex items-center justify-between">
                    <Link
                        href="/shop"
                        className="text-sm text-zinc-400 hover:text-white"
                    >
                        ← SHOP
                    </Link>
                    <button
                        className="text-zinc-400 text-lg"
                        aria-label="공유"
                    >
                        ⤴
                    </button>
                </header>

                {/* 썸네일 */}
                <section className="mb-6">
                    <div className="relative w-full overflow-hidden">
                        <Image
                            src={thumbnailUrl}
                            alt={item.itemName}
                            width={1024}
                            height={1024}
                            className="h-auto w-full object-cover"
                        />
                    </div>
                </section>

                {/* ===== 썸네일 바로 아래 영역 ===== */}
                <section className="mb-8 border-b border-zinc-800 pb-6">
                    {/* 상품명 / 상태 / 가격 */}
                    <h1 className="text-lg font-semibold leading-snug">
                        {item.itemName}
                    </h1>

                    <p className="mt-1 text-xs text-zinc-400">
                        {isSoldOut ? "판매종료" : "판매중"}
                    </p>

                    <p className="mt-3 text-2xl font-bold">
                        {item.itemPrice.toLocaleString("ko-KR")}원
                    </p>

                    {/* 멤버십 전용 배너 */}
                    {isMembershipOnly && (
                        <div className="mt-4 flex items-center justify-between rounded-md bg-red-900/80 px-4 py-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-base">❤️</span>
                                <span>멤버십 회원만 구매할 수 있어요</span>
                            </div>
                            <button className="text-xs font-semibold text-red-200">
                                가입 &gt;
                            </button>
                        </div>
                    )}

                    {/* ===== 배송 정보 + 상세 배송 옵션 아코디언 ===== */}
                    <div className="mt-6 text-xs">
                        {/* 상단 라인 */}
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                <span className="text-zinc-400">
                                    배송 정보
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowShippingDetail((prev) => !prev)
                                    }
                                    className="text-zinc-100 hover:text-white"
                                >
                                    상세 배송 옵션
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowShippingDetail((prev) => !prev)
                                }
                                aria-label="상세 배송 옵션 열기"
                                className="text-zinc-400 text-lg"
                            >
                                {showShippingDetail ? "▴" : "▾"}
                            </button>
                        </div>

                        {/* 상세 옵션 박스 */}
                        {showShippingDetail && (
                            <div className="mt-4 space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-[11px] leading-relaxed text-zinc-300">
                                {/* 국내 배송 */}
                                <div>
                                    <p className="text-xs font-semibold text-white">
                                        국내 배송
                                    </p>
                                    <p className="mt-1">
                                        CJ대한통운 / 기본 3,000원, 도서산간
                                        6,000원
                                        <br />
                                        (50,000원 이상 구매 시 무료 배송)
                                    </p>
                                    <p className="mt-1 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[10px] text-zinc-300">
                                        출고 이후 3영업일 소요 예상
                                    </p>
                                </div>

                                {/* 해외 배송 */}
                                <div>
                                    <p className="text-xs font-semibold text-white">
                                        해외 배송
                                    </p>
                                    <p className="mt-1">
                                        DHL / 배송 국가 및 무게에 따라
                                        배송비가 책정됩니다.
                                    </p>
                                    <p className="mt-1 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[10px] text-zinc-300">
                                        출고 이후 5영업일 이상 소요 예상
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 항상 제일 아래에 있는 문구 */}
                        <p className="mt-3 text-[11px] text-zinc-400">
                            국내·해외 배송이 가능한 상품이에요.
                        </p>
                    </div>
                </section>

                {/* ===== 상품 상세설명 이미지 롱스크롤 ===== */}
                <section className="mt-10 space-y-6 pb-4">
                    {detailImages.map((img) => (
                        <div
                            key={`${img.url}-${img.sortOrder}`}
                            className="relative w-full overflow-hidden"
                        >
                            <Image
                                src={img.url}
                                alt={item.itemName}
                                width={1200}
                                height={1600}
                                className="h-auto w-full object-cover"
                            />
                        </div>
                    ))}
                </section>
            </main>

            {/* ===== 상품 상세 전용 고정 푸터 (버튼 하나만) ===== */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 backdrop-blur-sm">
                <div className="mx-auto max-w-4xl px-4 py-3">
                    <button
                        type="button"
                        disabled={isSoldOut || cartLoading}
                        onClick={isSoldOut ? undefined : handleAddToCart}
                        className={`w-full rounded-xl py-3 text-sm font-semibold text-center ${
                            isSoldOut
                                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                : "bg-red-600 text-white hover:bg-red-500"
                        }`}
                    >
                        {isSoldOut ? "품절" : "장바구니에 담기"}
                    </button>

                    {cartError && (
                        <p className="mt-2 text-[11px] text-red-300 text-center">
                            {cartError}
                        </p>
                    )}
                </div>
            </footer>
        </div>
    );
}
