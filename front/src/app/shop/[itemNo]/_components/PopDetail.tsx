// src/app/shop/[itemNo]/_components/PopDetail.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DetailImage, ItemDetail } from "./types";
import PopOptionModal from "./PopOptionModal";
import { toImageSrc } from "./image";

interface Props {
    item: ItemDetail;
    detailImages: DetailImage[];
    thumbnailUrl: string;
}

export default function PopDetail({ item, detailImages, thumbnailUrl }: Props) {
    const router = useRouter();
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);

    const isSoldOut = item.itemSellStatus === "SOLD_OUT" || item.itemStock <= 0;

    const handleOpenOptionModal = () => {
        if (isSoldOut) return;
        setIsOptionModalOpen(true);
    };

    const thumbSrc = toImageSrc(thumbnailUrl, "PopDetail thumbnail");

    return (
        <div className="min-h-screen bg-black text-white">
            {/* POP 옵션 모달 */}
            <PopOptionModal isOpen={isOptionModalOpen} onClose={() => setIsOptionModalOpen(false)} item={item} />

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

                {/* POP 상단 정보 */}
                <section className="mb-8 border-b border-zinc-800 pb-6">
                    <p className="text-xs text-zinc-400">POP 구독형 이용권</p>
                    <h1 className="mt-2 text-lg font-semibold leading-snug">{item.itemName}</h1>
                    <p className="mt-3 text-2xl font-bold">
                        {item.itemPrice.toLocaleString("ko-KR")}원
                        <span className="ml-1 text-sm font-normal text-zinc-300">/월 (세금 포함가)</span>
                    </p>
                </section>

                {/* 상세설명 이미지들 */}
                <section className="mt-10 space-y-6 pb-4">
                    {detailImages.map((img, idx) => {
                        const src = toImageSrc(img.url, "PopDetail detail");
                        if (!src) return null;

                        return (
                            <div key={`${img.url ?? "no-url"}-${img.sortOrder ?? idx}`} className="relative w-full overflow-hidden">
                                <img src={src} alt={item.itemName} className="h-auto w-full object-cover" />
                            </div>
                        );
                    })}
                </section>

                {/* POP 유의사항 */}
                <section className="mt-8 pb-10 text-[11px] leading-relaxed text-zinc-400">
                    <p className="mb-2 font-semibold text-zinc-200">유의 사항</p>
                    <ul className="space-y-1 list-disc pl-4">
                        <li>이용권 구매 후 POP에 입장하였거나, 첫 결제 후 7일이 지나면 구매확정 처리됩니다.</li>
                        <li>구매확정 이후 청약철회가 불가합니다.</li>
                        <li>다인권 이용권 구매 시, 선택한 모든 인원의 POP 입장이 아닌 최초 입장 기준으로 사용 처리됩니다.</li>
                        <li>
                            더 이상 정기 결제를 원하지 않는 경우, 언제든 해지할 수 있습니다. 정기 결제를 해지하더라도 이용 기간
                            마지막 날까지 이용이 가능하며, 이용 기간 종료 후 해지 처리됩니다.
                        </li>
                        <li>멤버십 전용 상품의 경우, 구매확정되지 않은 멤버십은 이용권 결제완료 시 구매확정 처리됩니다.</li>
                    </ul>
                </section>
            </main>

            {/* 하단 푸터: POP은 구매하기만 */}
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
                        <button
                            type="button"
                            onClick={handleOpenOptionModal}
                            className="w-full rounded-xl py-3 text-sm font-semibold text-center bg-red-600 text-white hover:bg-red-500"
                        >
                            구매하기
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
}
