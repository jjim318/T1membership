"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

interface ErrorBody {
    resMessage?: string;
    message?: string;
}

const extractError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError<ErrorBody>(err)) {
        const ax = err as AxiosError<ErrorBody>;
        return (
            ax.response?.data?.resMessage ||
            ax.response?.data?.message ||
            fallback
        );
    }
    if (err instanceof Error) return err.message;
    return fallback;
};

export default function TossSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [status, setStatus] = useState<"LOADING" | "OK" | "ERROR">(
        "LOADING"
    );
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        const run = async () => {
            try {
                const paymentKey = searchParams.get("paymentKey");
                const orderId = searchParams.get("orderId");
                const amountStr = searchParams.get("amount");
                const amount = amountStr ? Number(amountStr) : NaN;

                if (!paymentKey || !orderId || Number.isNaN(amount)) {
                    setStatus("ERROR");
                    setMessage("잘못된 결제 정보입니다.");
                    return;
                }

                await apiClient.post("/api/pay/toss/confirm", {
                    paymentKey,
                    orderId,
                    amount,
                });

                setStatus("OK");
                setMessage("결제가 완료되었습니다.");
            } catch (err) {
                setStatus("ERROR");
                setMessage(
                    extractError(err, "결제 승인 중 오류가 발생했습니다.")
                );
            }
        };

        run();
    }, [searchParams]);

    const goMyOrders = () => {
        router.push("/mypage/orders"); // 형님 실제 주문내역 라우트에 맞게 수정
    };

    const goHome = () => {
        router.push("/");
    };

    return (
        <div className="w-full min-h-screen bg-black text-white flex items-center justify-center">
            <div className="max-w-md w-full px-6 py-8 border border-neutral-800 rounded-2xl bg-neutral-950">
                <h1 className="text-xl font-semibold mb-4">
                    {status === "OK"
                        ? "결제 완료"
                        : status === "LOADING"
                            ? "결제 처리 중..."
                            : "결제 실패"}
                </h1>

                <p className="text-sm text-neutral-300 mb-6">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        className="flex-1 h-10 rounded-xl bg-neutral-800 text-sm hover:bg-neutral-700"
                        onClick={goHome}
                    >
                        홈으로
                    </button>
                    <button
                        className="flex-1 h-10 rounded-xl bg-[#f04923] text-sm font-semibold hover:bg-[#e03f19]"
                        onClick={goMyOrders}
                    >
                        주문 내역 보기
                    </button>
                </div>
            </div>
        </div>
    );
}
