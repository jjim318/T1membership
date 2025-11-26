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
type PurchaseMode = "CART" | "BUY";

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

    // 장바구니/구매 로딩 상태
    const [cartLoading, setCartLoading] = useState(false);

    // ====== 옵션 선택 모달 상태 ======
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [showSizeList, setShowSizeList] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [optionError, setOptionError] = useState<string | null>(null);

    // ====== 멤버십 전용 안내 모달 ======
    const [showMembershipModal, setShowMembershipModal] = useState(false);

    // TODO: 실제 로그인/멤버십 여부로 교체
    const isMembershipUser = false;

    // ====== 예시용 사이즈 데이터 (형님 DB 값으로 교체하면 됨) ======
    const sizes = [
        { value: "S", label: "S", price: 189000, soldOut: false },
        { value: "M", label: "M", price: 189000, soldOut: true },
        { value: "L", label: "L", price: 189000, soldOut: false },
        { value: "XL", label: "XL", price: 189000, soldOut: false },
        { value: "2XL", label: "2XL", price: 189000, soldOut: false },
    ];

    // ====== 하단 버튼 클릭 → 옵션 모달 오픈 ======
    const openOptionModal = () => {
        if (isSoldOut) return;

        setIsOptionModalOpen(true);
        setOptionError(null);
        setShowSizeList(false);
        setSelectedSize(null);
        setQuantity(1);
    };

    const closeOptionModal = () => {
        setIsOptionModalOpen(false);
    };

    // ====== 수량 조절 ======
    const increaseQty = () => setQuantity((q) => q + 1);
    const decreaseQty = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

    // ====== 옵션 선택 후 실제 액션 처리 ======
    const handleConfirmWithOptions = async (mode: PurchaseMode) => {
        if (!selectedSize) {
            setOptionError("size를 선택해주세요.");
            return;
        }

        if (!item) {
            setOptionError("상품 정보를 불러오지 못했습니다.");
            return;
        }

        try {
            setCartLoading(true);
            setOptionError(null);

            if (mode === "CART") {
                // ✅ 장바구니 담기 (실제 itemNo 사용)
                await apiClient.post<ApiResult<unknown>>("/cart", {
                    itemNo: item.itemNo,
                    size: selectedSize,
                    quantity,
                });

                setIsOptionModalOpen(false);
                router.push("/shop/cart");
            } else {
                // ✅ 바로 구매
                if (!isMembershipUser) {
                    // 멤버십 회원이 아니면 안내 모달
                    setShowMembershipModal(true);
                    return;
                }

                // 멤버십 회원이면 실제 주문 생성 후 결제 페이지로 이동
                const res = await apiClient.post<ApiResult<{ orderNo: number }>>(
                    "/order/create-single",
                    {
                        itemNo: item.itemNo,
                        size: selectedSize,
                        quantity,
                    },
                );

                const orderNo = res.data.result.orderNo;
                setIsOptionModalOpen(false);
                router.push(`/order/checkout/${orderNo}`);
            }
        } catch (e) {
            console.error(e);
            setOptionError("요청 처리 중 오류가 발생했습니다.");
            alert("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setCartLoading(false);
        }
    };

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
                    `/item/${itemNo}`,
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
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    const rawThumb = sortedImages[0]?.fileName ?? "/shop/placeholder.png";
    const thumbnailUrl =
        rawThumb.startsWith("http") || rawThumb.startsWith("/")
            ? rawThumb
            : `/${rawThumb}`;

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

                {/* ===== 썸네일 아래 영역 ===== */}
                <section className="mb-8 border-b border-zinc-800 pb-6">
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

                        {showShippingDetail && (
                            <div className="mt-4 space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-[11px] leading-relaxed text-zinc-300">
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

                        <p className="mt-3 text-[11px] text-zinc-400">
                            국내·해외 배송이 가능한 상품이에요.
                        </p>
                    </div>
                </section>

                {/* ===== 상품 상세설명 이미지 ===== */}
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

            {/* ================== 옵션 선택 모달 ================== */}
            {isOptionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-5 py-4 shadow-xl border border-zinc-700">
                        {/* 헤더 */}
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-zinc-300">
                                size 선택
                            </span>
                            <button
                                type="button"
                                onClick={closeOptionModal}
                                className="text-zinc-400 hover:text-zinc-200 text-lg leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* Size 선택 영역 */}
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() => setShowSizeList((v) => !v)}
                                className="flex w-full items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                            >
                                <span>
                                    {selectedSize
                                        ? `size / ${selectedSize}`
                                        : "size 선택"}
                                </span>
                                <span className="text-xs text-zinc-400">▼</span>
                            </button>

                            {showSizeList && (
                                <div className="mt-2 space-y-1">
                                    {sizes.map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            disabled={s.soldOut}
                                            onClick={() => {
                                                if (s.soldOut) return;
                                                setSelectedSize(s.value);
                                                setShowSizeList(false);
                                            }}
                                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                                s.soldOut
                                                    ? "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed"
                                                    : selectedSize === s.value
                                                        ? "border-red-500 bg-zinc-800 text-white"
                                                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                            }`}
                                        >
                                            <span>
                                                {s.label}
                                                {s.soldOut && " [품절]"}
                                            </span>
                                            <span>
                                                {s.price.toLocaleString("ko-KR")}
                                                원
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 선택된 옵션 / 수량 */}
                        {selectedSize && (
                            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3">
                                <div className="mb-2 flex items-center justify-between text-sm text-zinc-100">
                                    <span>size / {selectedSize}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    {/* 수량 조절 */}
                                    <div className="inline-flex items-center rounded-md border border-zinc-700">
                                        <button
                                            type="button"
                                            onClick={decreaseQty}
                                            className="px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                                        >
                                            -
                                        </button>
                                        <span className="px-4 py-1 text-sm text-white">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={increaseQty}
                                            className="px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* 금액 (예시: 모든 사이즈 동일가) */}
                                    <span className="text-sm font-semibold text-white">
                                        {(sizes[0].price * quantity).toLocaleString(
                                            "ko-KR",
                                        )}
                                        원
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 에러 메시지 */}
                        {optionError && (
                            <p className="mb-2 text-center text-xs text-red-300">
                                {optionError}
                            </p>
                        )}

                        {/* 모달 하단 버튼: 장바구니 / 바로구매 */}
                        <div className="mt-2 flex gap-3">
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={() =>
                                    handleConfirmWithOptions("CART")
                                }
                                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                                    cartLoading
                                        ? "border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed"
                                        : "border-zinc-500 text-white bg-black hover:bg-zinc-900"
                                }`}
                            >
                                장바구니
                            </button>
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={() => handleConfirmWithOptions("BUY")}
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                바로 구매
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================== 멤버십 전용 안내 모달 ================== */}
            {showMembershipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-6 py-5 shadow-xl border border-zinc-700">
                        <p className="mb-6 text-center text-sm text-zinc-100">
                            멤버십 회원만 구매할 수 있어요
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowMembershipModal(false)}
                                className="flex-1 rounded-xl bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-600"
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push("/membership/join")}
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                멤버십 가입
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================== 하단 고정 푸터 ================== */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 backdrop-blur-sm">
                <div className="mx-auto max-w-4xl px-4 py-3">
                    {isSoldOut ? (
                        <button
                            type="button"
                            disabled
                            className="w-full rounded-xl py-3 text-sm font-semibold text-center bg-zinc-700 text-zinc-400 cursor-not-allowed"
                        >
                            품절
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            {/* 장바구니 버튼 */}
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={openOptionModal}
                                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-center border ${
                                    cartLoading
                                        ? "border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed"
                                        : "border-zinc-500 text-white bg-black hover:bg-zinc-900"
                                }`}
                            >
                                장바구니
                            </button>

                            {/* 구매하기 버튼 */}
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={openOptionModal}
                                className="flex-1 rounded-xl py-3 text-sm font-semibold text-center bg-red-600 text-white hover:bg-red-500"
                            >
                                구매하기
                            </button>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
