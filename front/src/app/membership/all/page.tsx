// src/app/membership/all/page.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ 추가
import Image from "next/image";

type Currency = "KRW" | "USD";

export default function MembershipAllPage() {
    const router = useRouter(); // ✅ 추가
    // 🔥 통화 상태 (전체 페이지 공통)
    const [currency, setCurrency] = useState<Currency>("KRW");
    const [openCurrency, setOpenCurrency] = useState(false);

    // 🔥 정기 / 단건 섹션 스크롤용 ref
    const recurringRef = useRef<HTMLDivElement | null>(null);
    const oneTimeRef = useRef<HTMLDivElement | null>(null);

    const scrollToRecurring = () => {
        recurringRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const scrollToOneTime = () => {
        oneTimeRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const currencyLabel =
        currency === "KRW"
            ? "KRW - 한국 ₩(원)"
            : "USD - 미국 $(달러)";

    // 👉 형님 마음대로 조절 가능 (실제 멤버십 가격으로)
    const RECURRING_KRW = 6300;
    const ONE_TIME_KRW = 6500;

    const formatPrice = (priceKrw: number) => {
        if (currency === "KRW") {
            return `${priceKrw.toLocaleString("ko-KR")}원/1개월`;
        }
        // 대충 환율 1,000원 = 1달러 느낌으로만 맞춰둠
        const usd = priceKrw / 1000;
        return `$${usd.toFixed(2)}/1개월`;
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="mx-auto max-w-5xl px-6 pt-16 pb-24">
                {/* ───────────────── 상단 헤더 ───────────────── */}
                <section className="mb-8">
                    <div className="flex items-center justify-between">
                        {/* 왼쪽: 타이틀 */}
                        <h1 className="text-2xl font-semibold">
                            멤버십 가입하기
                        </h1>

                        {/* 오른쪽: 🔥 통화 아코디언 박스 */}
                        <div className="relative text-xs">
                            <button
                                type="button"
                                onClick={() =>
                                    setOpenCurrency((v) => !v)
                                }
                                className="flex min-w-[210px] items-center justify-between rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-200 bg-zinc-900"
                            >
                                <span>{currencyLabel}</span>
                                <span className="text-[10px]">▼</span>
                            </button>

                            {openCurrency && (
                                <div className="absolute right-0 mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 py-1 text-xs shadow-lg z-10">
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

                    {/* 🔥 정기/단건 선택 버튼 두 개 */}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={scrollToRecurring}
                            className="rounded-full bg-zinc-800 px-5 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                        >
                            2025 T1 Membership 정기결제
                        </button>
                        <button
                            type="button"
                            onClick={scrollToOneTime}
                            className="rounded-full bg-zinc-800 px-5 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                        >
                            2025 T1 Membership 단건결제
                        </button>
                    </div>
                </section>

                {/* 가운데 점 표시 (T1 사이트 스타일) */}
                <div className="flex justify-center py-6">
                    <span className="h-1 w-1 rounded-full bg-zinc-500" />
                </div>

                {/* ───────────────── 정기결제 섹션 ───────────────── */}
                <section ref={recurringRef} className="scroll-mt-24">
                    <div className="flex flex-col items-center gap-6">
                        {/* 상단 아이콘/썸네일 */}
                        <div className="relative h-24 w-24">
                            <Image
                                src="/shop/정기결제.png"
                                // 형님 실제 이미지 경로로 교체
                                alt="2025 T1 Membership [정기결제]"
                                fill
                                className="rounded-2xl object-cover"
                            />
                        </div>

                        <h2 className="text-lg font-semibold">
                            2025 T1 Membership [정기결제]
                        </h2>

                        {/* 상세 이미지들 (기존 정기결제 상세페이지 이미지 그대로) */}
                        <div className="mt-4 w-full space-y-4">
                            <Image
                                src="/shop/정기결제-detail-1.png"
                                alt="정기결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/정기결제-detail-2.png"
                                alt="정기결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/정기결제-detail-3.png"
                                alt="정기결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/정기결제-detail-4.png"
                                alt="정기결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/정기결제-detail-5.png"
                                alt="정기결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            {/* 필요하면 2,3,4 ... 계속 추가 */}
                        </div>

                        {/* 옵션 선택 + 정기결제 카드 느낌 (간략화 버전) */}
                        <div className="mt-12 w-full max-w-3xl">
                            <p className="mb-3 text-xs font-semibold text-zinc-200">
                                옵션 선택
                            </p>

                            <div className="w-[360px] rounded-2xl border border-zinc-700 bg-zinc-950 px-8 py-7 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">
                                        2025 T1 Membership [정기결제]
                                    </h3>
                                    <p className="text-xs text-zinc-300">
                                        {formatPrice(RECURRING_KRW)}
                                    </p>
                                </div>

                                {/* 혜택 목록 – 형님 기존 멤버십 혜택 텍스트 그대로 */}
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
                                        <span>멤버십 전용 온·오프라인 이벤트</span>
                                    </li>
                                </ul>

                                <div className="mt-6 space-y-2">
                                    <button
                                        type="button"
                                        className="flex h-10 w-full items-center justify-center rounded-md bg-zinc-700 text-xs font-medium text-zinc-200"
                                    >
                                        자세히
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.push("/order/membership/checkout?payType=RECURRING")}
                                        className="flex h-10 w-full items-center justify-center rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-500"
                                    >
                                        가입하기
                                    </button>

                                </div>
                            </div>
                        </div>

                        {/* 정기결제 유의사항 */}
                        <section className="mt-10 w-full max-w-3xl text-left text-[11px] leading-relaxed text-zinc-400">
                            <p className="mb-2 font-semibold text-zinc-300">
                                유의사항
                            </p>
                            <p>
                                · 상품 구매 후 콘텐츠를 열람하였거나, 이용 시작 후 7일이
                                지나면 구매 확정 처리됩니다.
                            </p>
                            <p>· 구매 확정 이후 청약 철회가 불가합니다.</p>
                            <p>
                                · 더 이상 정기 결제를 원하지 않는 경우, 언제든 해지할 수
                                있습니다. 정기 결제를 해지하더라도 이용 기간 마지막 날까지
                                이용이 가능하며, 이용 기간 종료 후 해지 처리됩니다.
                            </p>
                        </section>
                    </div>
                </section>

                {/* 정기/단건 사이 구분선 (중간에 푸터/추가 헤더 없음) */}
                <div className="mt-24 h-px w-full bg-zinc-800" />

                {/* ───────────────── 단건결제 섹션 ───────────────── */}
                <section
                    ref={oneTimeRef}
                    className="mt-16 scroll-mt-24"
                >
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative h-24 w-24">
                            <Image
                                src="/shop/단건결제.png"
                                alt="2025 T1 Membership [단건결제]"
                                fill
                                className="rounded-2xl object-cover"
                            />
                        </div>

                        <h2 className="text-lg font-semibold">
                            2025 T1 Membership [단건결제]
                        </h2>

                        <div className="mt-4 w-full space-y-4">
                            <Image
                                src="/shop/단건결제-detail-1.png"
                                alt="단건결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/단건결제-detail-2.png"
                                alt="단건결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/단건결제-detail-3.png"
                                alt="단건결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/단건결제-detail-4.png"
                                alt="단건결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <Image
                                src="/shop/단건결제-detail-5.png"
                                alt="단건결제 상세 1"
                                width={1200}
                                height={1600}
                                className="w-full h-auto"
                            />
                            {/* 필요하면 추가 이미지 더 넣기 */}
                        </div>

                        <div className="mt-12 w-full max-w-3xl">
                            <p className="mb-3 text-xs font-semibold text-zinc-200">
                                옵션 선택
                            </p>

                            <div className="w-[360px] rounded-2xl border border-zinc-700 bg-zinc-950 px-8 py-7 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">
                                        2025 T1 Membership [단건결제]
                                    </h3>
                                    <p className="text-xs text-zinc-300">
                                        {formatPrice(ONE_TIME_KRW)}
                                    </p>
                                </div>

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
                                        <span>멤버십 전용 온·오프라인 이벤트</span>
                                    </li>
                                </ul>

                                <div className="mt-6 space-y-2">
                                    <button
                                        type="button"
                                        className="flex h-10 w-full items-center justify-center rounded-md bg-zinc-700 text-xs font-medium text-zinc-200"
                                    >
                                        자세히
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.push("/order/membership/checkout?payType=ONE_TIME")}
                                        className="flex h-10 w-full items-center justify-center rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-500"
                                    >
                                        가입하기
                                    </button>

                                </div>
                            </div>
                        </div>

                        {/* 단건결제 유의사항 (필요하면 텍스트 다르게 작성) */}
                        <section className="mt-10 w-full max-w-3xl text-left text-[11px] leading-relaxed text-zinc-400">
                            <p className="mb-2 font-semibold text-zinc-300">
                                유의사항
                            </p>
                            <p>
                                · 상품 구매 후 콘텐츠를 열람하였거나, 이용 시작 후 7일이
                                지나면 구매 확정 처리됩니다.
                            </p>
                            <p>· 구매 확정 이후 청약 철회가 불가합니다.</p>
                        </section>
                    </div>
                </section>
            </main>
        </div>
    );
}
