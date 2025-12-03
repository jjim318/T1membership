// src/app/toss/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface TossConfirmRes {
    orderNo: number;
    orderStatus: string;
    orderTotalPrice: number;
}

export default function TossSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        // 1) 토스가 넘겨준 쿼리 파라미터
        const orderId = searchParams.get("orderId");
        const paymentKey = searchParams.get("paymentKey");
        const amount = searchParams.get("amount");

        if (!orderId || !paymentKey || !amount) {
            setErrorMsg("필수 파라미터가 없습니다.");
            setLoading(false);
            return;
        }

        // 🔥 orderId(string) -> orderNo(number) 로 변환
        const orderNo = Number(orderId);
        if (!Number.isFinite(orderNo)) {
            setErrorMsg("잘못된 주문 번호입니다.");
            setLoading(false);
            return;
        }

        const confirm = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                console.log("[toss/success] query =", {
                    orderId,
                    orderNo,
                    paymentKey,
                    amount,
                });

                // 2) 백엔드 confirm 호출
                const res = await apiClient.post<ApiResult<TossConfirmRes>>(
                    "/api/pay/toss/confirm",
                    {
                        // 🔥 이제 orderId 말고 orderNo 를 보낸다
                        orderNo,
                        paymentKey,
                        amount: Number(amount),
                    },
                );

                if (!res.data.isSuccess) {
                    throw new Error(res.data.resMessage || "결제 승인 실패");
                }

                // 3) 승인 성공 → 주문 상세로 이동
                const nextOrderNo = res.data.result.orderNo;
                router.replace(`/order/checkout/${nextOrderNo}`);
            } catch (e: any) {
                console.error("[toss/success] confirm error", e);
                setErrorMsg(
                    e?.response?.data?.resMessage ||
                    e?.message ||
                    "결제 승인 중 오류가 발생했습니다.",
                );
            } finally {
                setLoading(false);
            }
        };

        confirm();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-6 py-6">
                <h1 className="text-xl font-semibold mb-4">결제 처리 중...</h1>

                {loading && (
                    <p className="text-sm text-zinc-300">
                        잠시만 기다려 주세요.
                    </p>
                )}

                {!loading && errorMsg && (
                    <>
                        <p className="text-sm text-red-400 mb-4">
                            {errorMsg}
                        </p>
                        <button
                            className="w-full rounded-xl bg-zinc-800 py-2 text-sm"
                            onClick={() => router.push("/")}
                        >
                            홈으로
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
