// src/app/shop/[itemNo]/_components/MDDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DetailImage, ItemDetail } from "./types";
import ToastCartAdded from "./ToastCartAdded";
import OptionModal from "./OptionModal";
import { toImageSrc } from "./image";

interface Props {
    item: ItemDetail;
    detailImages: DetailImage[];
    thumbnailUrl: string;
}

export default function MDDetail({ item, detailImages, thumbnailUrl }: Props) {
    const router = useRouter();

    const [showShippingDetail, setShowShippingDetail] = useState(false);

    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [showCartToast, setShowCartToast] = useState(false);
    const cartToastTimerRef = useRef<number | null>(null);

    const isSoldOut = item.itemSellStatus === "SOLD_OUT" || item.itemStock <= 0;

    // 지금 구조상 MD 전체를 멤버십 전용으로 간주 (기존 로직 유지)
    const isMembershipOnly = item.itemCategory === "MD";

    useEffect(() => {
        return () => {
            if (cartToastTimerRef.current) {
                window.clearTimeout(cartToastTimerRef.current);
            }
        };
    }, []);

    const handleOpenOptionModal = () => {
        if (isSoldOut) return;
        setIsOptionModalOpen(true);
    };

    const handleCartSuccess = () => {
        setIsOptionModalOpen(false);
        setShowCartToast(true);

        if (cartToastTimerRef.current !== null) {
            window.clearTimeout(cartToastTimerRef.current);
        }

        cartToastTimerRef.current = window.setTimeout(() => {
            setShowCartToast(false);
        }, 3000);
    };

    // ✅ 썸네일 정규화
    const thumbSrc = toImageSrc(thumbnailUrl, "MDDetail thumbnail");

    return (
        <div className="min-h-screen bg-black text-white">
            <ToastCartAdded visible={showCartToast} onClose={() => setShowCartToast(false)} />

            {/* 옵션 모달 */}
            <OptionModal
                isOpen={isOptionModalOpen}
                onClose={() => setIsOptionModalOpen(false)}
                item={item}
                onCartSuccess={handleCartSuccess}
            />

            {/* 내용이 푸터에 가리지 않도록 아래 패딩 */}
            <main className="mx-auto max-w-4xl px-4 pb-28 pt-6">
                {/* 상단: 뒤로가기 + 공유 */}
                <header className="mb-4 flex items-center justify-between">
                    <Link href="/shop" className="text-sm text-zinc-400 hover:text-white">
                        ← SHOP
                    </Link>
                    <button className="text-zinc-400 text-lg" aria-label="공유">
                        ⤴
                    </button>
                </header>

                {/* 썸네일 */}
                <section className="mb-6">
                    <div className="relative w-full overflow-hidden">
                        {thumbSrc ? (
                            <img src={thumbSrc} alt={item.itemName} className="h-auto w-full object-cover" />
                        ) : (
                            <div className="flex h-64 items-center justify-center text-xs text-zinc-500">
                                이미지 없음
                            </div>
                        )}
                    </div>
                </section>

                {/* 썸네일 아래 영역 */}
                <section className="mb-8 border-b border-zinc-800 pb-6">
                    <h1 className="text-lg font-semibold leading-snug">{item.itemName}</h1>

                    <p className="mt-3 text-2xl font-bold">{item.itemPrice.toLocaleString("ko-KR")}원</p>

                    {/* 멤버십 전용 배너 (MD) */}
                    {isMembershipOnly && (
                        <div className="mt-4 flex items-center justify-between rounded-md bg-red-900/80 px-4 py-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-base">❤️</span>
                                <span>멤버십 회원만 구매할 수 있어요</span>
                            </div>
                            <button
                                className="text-xs font-semibold text-red-200"
                                onClick={() => router.push("/membership/join")}
                            >
                                가입 &gt;
                            </button>
                        </div>
                    )}

                    {/* 배송 정보 */}
                    <div className="mt-6 text-xs">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                <span className="text-zinc-400">배송 정보</span>
                                <button
                                    type="button"
                                    onClick={() => setShowShippingDetail((prev) => !prev)}
                                    className="text-zinc-100 hover:text-white"
                                >
                                    상세 배송 옵션
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowShippingDetail((prev) => !prev)}
                                aria-label="상세 배송 옵션 열기"
                                className="text-zinc-400 text-lg"
                            >
                                {showShippingDetail ? "▴" : "▾"}
                            </button>
                        </div>

                        {showShippingDetail && (
                            <div className="mt-4 space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-[11px] leading-relaxed text-zinc-300">
                                <div>
                                    <p className="text-xs font-semibold text-white">국내 배송</p>
                                    <p className="mt-1">
                                        CJ대한통운 / 기본 3,000원, 도서산간 6,000원
                                        <br />
                                        (50,000원 이상 구매 시 무료 배송)
                                    </p>
                                    <p className="mt-1 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[10px] text-zinc-300">
                                        출고 이후 3영업일 소요 예상
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-white">해외 배송</p>
                                    <p className="mt-1">DHL / 배송 국가 및 무게에 따라 배송비가 책정됩니다.</p>
                                    <p className="mt-1 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[10px] text-zinc-300">
                                        출고 이후 5영업일 이상 소요 예상
                                    </p>
                                </div>
                            </div>
                        )}

                        <p className="mt-3 text-[11px] text-zinc-400">국내·해외 배송이 가능한 상품이에요.</p>
                    </div>
                </section>

                {/* 상품 상세설명 이미지 */}
                <section className="mt-10 space-y-6 pb-4">
                    {detailImages.map((img, idx) => {
                        const src = toImageSrc(img.url, "MDDetail detail");
                        if (!src) return null;

                        return (
                            <div key={`${img.url ?? "no-url"}-${img.sortOrder ?? idx}`} className="relative w-full overflow-hidden">
                                <img src={src} alt={item.itemName} className="h-auto w-full object-cover" />
                            </div>
                        );
                    })}
                </section>
            </main>

            {/* 하단 고정 푸터 */}
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
                            <button
                                type="button"
                                onClick={handleOpenOptionModal}
                                className="flex-1 rounded-xl py-3 text-sm font-semibold text-center border border-zinc-500 text-white bg-black hover:bg-zinc-900"
                            >
                                장바구니
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenOptionModal}
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
