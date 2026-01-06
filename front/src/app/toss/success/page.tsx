// src/app/toss/success/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import type { AxiosError } from "axios";

interface TossConfirmApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string | null;
    data: T;
}

interface TossConfirmRes {
    orderNo: number;
    toss: any;
}

export default function TossSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 새로고침/StrictMode 두 번 호출 방지용
    const didConfirmRef = useRef(false);

    useEffect(() => {
        if (didConfirmRef.current) return;
        didConfirmRef.current = true;

        // Toss가 successUrl 로 자동으로 붙여주는 값들
        const paymentKey = searchParams.get("paymentKey");
        const amount = searchParams.get("amount");
        const orderId = searchParams.get("orderId"); // 우리가 만든 orderTossId

        if (!paymentKey || !amount || !orderId) {
            setErrorMsg("필수 파라미터가 없습니다.");
            setLoading(false);
            return;
        }

        const confirm = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                console.log("[toss/success] query =", {
                    paymentKey,
                    amount,
                    orderId,
                });

                // 백엔드 결제 승인 요청
                const res = await apiClient.post<
                    TossConfirmApiResult<TossConfirmRes>
                >("/api/pay/toss/confirm", {
                    paymentKey,              // TossConfirmReq.paymentKey
                    orderId,                 // TossConfirmReq.orderId
                    totalAmount: Number(amount), // TossConfirmReq.totalAmount
                });

                console.log("[toss/success] confirm res =", res.data);

                if (!res.data.isSuccess) {
                    throw new Error(res.data.resMessage || "결제 승인 실패");
                }

                const nextOrderNo = res.data.data.orderNo;
                router.replace(`/mypage/orders/${nextOrderNo}`);
            } catch (err) {
                const e = err as AxiosError<any>;
                console.error("[toss/success] confirm error", {
                    axiosMessage: e.message,
                    data: e.response?.data,
                });

                const data = e.response?.data as
                    | { resMessage?: string; message?: string }
                    | undefined;

                setErrorMsg(
                    data?.resMessage ||
                    data?.message ||
                    e.message ||
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
                    <p className="text-sm text-zinc-300">잠시만 기다려 주세요.</p>
                )}

                {!loading && errorMsg && (
                    <>
                        <p className="text-sm text-red-400 mb-4">{errorMsg}</p>
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