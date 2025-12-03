"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function TossFailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const message =
        searchParams.get("message") ||
        searchParams.get("code") ||
        "결제가 취소되었거나 실패했습니다.";

    return (
        <div className="w-full min-h-screen bg-black text-white flex items-center justify-center">
            <div className="max-w-md w-full px-6 py-8 border border-neutral-800 rounded-2xl bg-neutral-950">
                <h1 className="text-xl font-semibold mb-4">
                    결제 실패
                </h1>
                <p className="text-sm text-neutral-300 mb-6 whitespace-pre-line">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        className="flex-1 h-10 rounded-xl bg-neutral-800 text-sm hover:bg-neutral-700"
                        onClick={() => router.back()}
                    >
                        이전 페이지
                    </button>
                    <button
                        className="flex-1 h-10 rounded-xl bg-[#f04923] text-sm font-semibold hover:bg-[#e03f19]"
                        onClick={() => router.push("/")}
                    >
                        홈으로
                    </button>
                </div>
            </div>
        </div>
    );
}
