// src/app/shop/[itemNo]/_components/MembershipDetail.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    DetailImage,
    ItemDetail,
    MembershipPayType,
} from "./types";

interface Props {
    item: ItemDetail;
    detailImages: DetailImage[];
}

export default function MembershipDetail({ item, detailImages }: Props) {
    const router = useRouter();

    const [currency, setCurrency] = useState<"KRW" | "USD">("KRW");
    const [openCurrency, setOpenCurrency] = useState(false);

    const currencyLabel =
        currency === "KRW" ? "KRW - 한국 ₩(원)" : "USD - 미국 $(달러)";

    const thumbnailImage = detailImages[0];
    const otherImages = detailImages.slice(1);

    const priceKRW = item.itemPrice;
    const payType = (item.membershipPayType || "").toUpperCase();

    let priceUSD = 6.3; // 기본 RECURRING

    if (payType === "ONE_TIME") {
        priceUSD = 6.5;
    }
    if (payType === "YEARLY") {
        priceUSD = 60.0;
    }

    // 멤버십 결제 페이지로 이동
    const handleMembershipCheckout = () => {
        const planCode = "T1-2025-MONTHLY";

        let months = 1;
        let autoRenew = false;

        switch (payType as MembershipPayType) {
            case "YEARLY":
                months = 12;
                break;
            case "RECURRING":
                autoRenew = true;
                break;
            case "ONE_TIME":
            default:
                months = 1;
                autoRenew = false;
        }

        const params = new URLSearchParams({
            planCode,
            months: String(months),
            autoRenew: String(autoRenew),
            itemName: item.itemName,
            price: String(item.itemPrice),
            membershipPayType: payType,
        });

        router.push(`/order/membership/checkout?${params.toString()}`);
    };

    return (
        <main className="min-h-screen bg-black text-zinc-100">
            <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-16 pb-24">
                {/* 상단: 제목 + 통화 선택 */}
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">멤버십 가입하기</h1>

                    <div className="relative text-xs">
                        <button
                            type="button"
                            onClick={() => setOpenCurrency((v) => !v)}
                            className="flex min-w-[180px] items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                        >
                            <span>{currencyLabel}</span>
                            <span className="ml-2 text-[10px]">▼</span>
                        </button>

                        {openCurrency && (
                            <div className="absolute right-0 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 py-1 text-xs shadow-lg">
                                <button
                                    type="button"
                                    className="flex w-full items-center px-3 py-2 hover:bg-zinc-800"
                                    onClick={() => {
                                        setCurrency("KRW");
                                        setOpenCurrency(false);
                                    }}
                                >
                                    KRW - 한국 ₩(원)
                                </button>
                                <button
                                    type="button"
                                    className="flex w-full items-center px-3 py-2 hover:bg-zinc-800"
                                    onClick={() => {
                                        setCurrency("USD");
                                        setOpenCurrency(false);
                                    }}
                                >
                                    USD - 미국 $(달러)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 상단 썸네일 + 상품명 */}
                <div className="mt-4 flex flex-col items-center">
                    {thumbnailImage && (
                        <div className="mb-4">
                            <Image
                                src={thumbnailImage.url}
                                alt={`${item.itemName} 썸네일`}
                                width={96}
                                height={96}
                                className="h-24 w-24 rounded-2xl object-cover"
                                priority
                            />
                        </div>
                    )}
                    <h2 className="text-base font-semibold text-center">
                        {item.itemName}
                    </h2>
                </div>

                {/* 설명용 큰 이미지들 */}
                {otherImages.length > 0 && (
                    <div className="mt-8 w-full space-y-4">
                        {otherImages.map((img, idx) => (
                            <div
                                key={`${img.url}-${img.sortOrder ?? idx}`}
                                className="relative w-full overflow-hidden rounded-xl bg-zinc-900"
                            >
                                <Image
                                    src={img.url}
                                    alt={`${item.itemName} 상세 이미지 ${idx + 1}`}
                                    width={1200}
                                    height={1600}
                                    className="h-auto w-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 옵션 선택 + 정기결제 카드 */}
                <div className="mt-16 w-full max-w-3xl">
                    <p className="mb-3 text-xs font-semibold text-zinc-200">
                        옵션 선택
                    </p>

                    <div className="w-[360px] rounded-2xl border border-zinc-700 bg-zinc-950 px-8 py-7 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        {/* 제목 / 가격 */}
                        <div className="space-y-1">
                            <h2 className="text-sm font-semibold">{item.itemName}</h2>
                            <p className="text-xs text-zinc-300">
                                {currency === "KRW"
                                    ? `${priceKRW.toLocaleString(
                                        "ko-KR",
                                    )}원/1개월`
                                    : `$${priceUSD.toFixed(2)}/1개월`}
                            </p>
                        </div>

                        {/* 혜택 목록 */}
                        <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 콘텐츠</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>스타 스토리 열람 및 댓글 남기기</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 커뮤니티</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 상품</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 온/오프라인 이벤트</span>
                            </li>
                        </ul>

                        {/* 버튼들 */}
                        <div className="mt-6 space-y-2">
                            <button
                                type="button"
                                className="flex h-10 w-full items-center justify-center rounded-md bg-zinc-700 text-xs font-medium text-zinc-200"
                            >
                                자세히
                            </button>
                            <button
                                type="button"
                                onClick={handleMembershipCheckout}
                                className="flex h-10 w-full items-center justify-center rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-500"
                            >
                                가입하기
                            </button>
                        </div>
                    </div>
                </div>

                {/* 유의사항 */}
                <section className="mt-10 w-full max-w-3xl text-left text-[11px] leading-relaxed text-zinc-400">
                    <p className="mb-2 font-semibold text-zinc-300">유의사항</p>
                    <p>
                        · 상품 구매 후 콘텐츠를 열람하였거나, 이용 시작 후 7일이 지나면
                        구매 확정 처리됩니다.
                    </p>
                    <p>· 구매 확정 이후 청약 철회가 불가합니다.</p>
                    <p>
                        · 더 이상 정기 결제를 원하지 않는 경우, 언제든 해지할 수
                        있습니다. 정기 결제를 해지하더라도 이용 기간 마지막 날까지
                        이용이 가능하며, 이용 기간 종료 후 해지 처리됩니다.
                    </p>
                </section>

                {/* 하단 전체 멤버십 보기 */}
                <div className="mt-12 flex w-full justify-center border-t border-zinc-800 pt-8">
                    <button
                        type="button"
                        className="text-[13px] font-medium text-sky-400 hover:text-sky-300"
                    >
                        가입 가능한 전체 멤버십 보기 &rarr;
                    </button>
                </div>
            </section>
        </main>
    );
}
