"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

// ===== 타입 =====
type PaymentMethod = "TOSS_QUICK" | "TOSS" | "EXIMBAY";

interface ErrorBody {
    resMessage?: string;
    message?: string;
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface CreateOrderRes {
    orderNo: number;
}

interface TossPrepareResponse {
    isSuccess: boolean;
    resCode?: number;
    resMessage?: string;
    data: {
        orderNo: number;
        orderId: string;
        amount: number;
        orderName: string;
    };
}

interface CheckoutItem {
    itemNo: number;
    imageUrl?: string | null;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    price: number;
    quantity: number;
}

interface CheckoutData {
    buyerName: string;
    buyerEmail: string;
    items: CheckoutItem[];
    totalAmount: number;
}

// Toss
type TossPayType = "CARD" | "TRANSFER";

interface TossRequestBase {
    amount: number;
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
}

interface TossClient {
    requestPayment: (
        method: TossPayType,
        params: TossRequestBase
    ) => Promise<void>;
}

interface TossWindow extends Window {
    TossPayments?: (clientKey: string) => TossClient;
}

const getTossClient = (): TossClient | null => {
    if (typeof window === "undefined") return null;
    const w = window as TossWindow;
    if (!w.TossPayments) return null;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
    if (!clientKey) return null;
    return w.TossPayments(clientKey);
};

const formatPrice = (n: number) => `${n.toLocaleString("ko-KR")}원`;

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

const resolveBackendMethod = (
    pm: PaymentMethod
): "ACCOUNT" | "CARD" => {
    if (pm === "TOSS_QUICK") return "ACCOUNT";
    return "CARD";
};

const resolveTossPayType = (pm: PaymentMethod): TossPayType => {
    if (pm === "TOSS_QUICK") return "TRANSFER";
    return "CARD";
};

// ===== 컴포넌트 =====
export default function PopCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const popIdParam = searchParams.get("popId");
    const qtyParam = searchParams.get("qty");
    const variantParam = searchParams.get("variant") ?? "";

    const popId = popIdParam ? Number(popIdParam) : null;
    const quantity = qtyParam ? Number(qtyParam) : 1;

    const [variant, setVariant] =
        useState<string>(variantParam);

    const [data, setData] = useState<CheckoutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>("TOSS_QUICK");

    const [pointInput, setPointInput] = useState("0");

    const [agreePrivacy, setAgreePrivacy] =
        useState(false);
    const [agreeCommunity, setAgreeCommunity] =
        useState(false);
    const [agreePaymentTerms, setAgreePaymentTerms] =
        useState(false);
    const [agreeAll, setAgreeAll] = useState(false);

    useEffect(() => {
        if (agreeAll) {
            setAgreePrivacy(true);
            setAgreeCommunity(true);
            setAgreePaymentTerms(true);
        }
    }, [agreeAll]);

    useEffect(() => {
        if (
            agreePrivacy &&
            agreeCommunity &&
            agreePaymentTerms
        ) {
            setAgreeAll(true);
        } else {
            setAgreeAll(false);
        }
    }, [agreePrivacy, agreeCommunity, agreePaymentTerms]);

    const canPay =
        !!data &&
        agreePrivacy &&
        agreeCommunity &&
        agreePaymentTerms;

    // ===== 화면용 데이터 – POP 프리뷰 API =====
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                if (!popId) {
                    throw new Error("popId 가 필요합니다.");
                }

                const res =
                    await apiClient.get<ApiResult<CheckoutData>>(
                        "/checkout/pop",
                        {
                            params: {
                                popId,
                                qty: quantity,
                                variant: variantParam,
                            },
                        }
                    );

                if (!res.data.isSuccess) {
                    throw new Error(
                        res.data.resMessage ||
                        "결제 정보를 불러오지 못했습니다."
                    );
                }

                setData(res.data.result);
            } catch (err) {
                setErrorMsg(
                    extractError(
                        err,
                        "결제 정보를 불러오지 못했습니다."
                    )
                );
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [popId, quantity, variantParam]);

    const validatePop = (): string | null => {
        if (!popId) return "popId 가 필요합니다.";
        if (!variant.trim())
            return "선택한 스타(옵션)를 입력해 주세요.";
        return null;
    };

    // ===== 주문 생성 =====
    const createPopOrder = async (): Promise<number> => {
        const err = validatePop();
        if (err) throw new Error(err);

        const body = {
            popId,
            quantity,
            variant: variant || undefined,
        };

        const res = await apiClient.post<CreateOrderRes>(
            "/order/POP",
            body
        );
        return res.data.orderNo;
    };

    // ===== Toss prepare =====
    const prepareToss = async (
        orderNo: number
    ): Promise<TossPrepareResponse["data"]> => {
        const method = resolveBackendMethod(paymentMethod);

        try {
            const res = await apiClient.post<TossPrepareResponse>(
                "/api/pay/toss/prepare",
                { orderNo, method }
            );
            if (!res.data.isSuccess) {
                throw new Error(
                    res.data.resMessage ||
                    "Toss 결제 준비에 실패했습니다."
                );
            }
            return res.data.data;
        } catch (err) {
            throw new Error(
                extractError(
                    err,
                    "Toss 결제 준비 중 오류가 발생했습니다."
                )
            );
        }
    };

    // ===== 결제 버튼 =====
    const handlePay = async () => {
        if (!canPay) {
            alert("주문 내용과 약관에 모두 동의해 주세요.");
            return;
        }
        if (!data) return;

        try {
            const orderNo = await createPopOrder();
            const prepared = await prepareToss(orderNo);

            const tossClient = getTossClient();
            if (!tossClient) {
                alert("Toss 스크립트 또는 클라이언트 키가 없습니다.");
                return;
            }

            const payType = resolveTossPayType(paymentMethod);

            const base: TossRequestBase = {
                amount: prepared.amount,
                orderId: prepared.orderId,
                orderName: prepared.orderName,
                successUrl: `${window.location.origin}/order/toss/success`,
                failUrl: `${window.location.origin}/order/toss/fail`,
                customerEmail: data.buyerEmail,
                customerName: data.buyerName,
            };

            await tossClient.requestPayment(payType, base);
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "결제 요청 중 오류가 발생했습니다."
            );
        }
    };

    // ===== UI =====
    return (
        <div className="w-full min-h-screen bg-black text-white">
            <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
                <h1 className="text-3xl font-semibold mb-8">
                    결제하기
                </h1>

                {loading && (
                    <div className="text-sm text-neutral-400">
                        결제 정보를 불러오는 중입니다…
                    </div>
                )}
                {errorMsg && (
                    <div className="text-sm text-red-400 mb-4">
                        {errorMsg}
                    </div>
                )}

                {data && (
                    <div className="flex flex-col gap-8">
                        {/* 주문자 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm text-neutral-400 mb-1">
                                        주문자
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {data.buyerName}
                                    </div>
                                    <div className="text-xs text-neutral-400 mt-1">
                                        {data.buyerEmail}
                                    </div>
                                </div>
                                <button
                                    className="px-4 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg hover:bg-neutral-800"
                                    onClick={() =>
                                        router.push("/mypage/edit")
                                    }
                                >
                                    변경
                                </button>
                            </div>
                        </section>

                        {/* 주문 상품 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-4">
                                주문 상품
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 h-32 bg-neutral-900 rounded-lg flex items-center justify-center text-[11px] text-neutral-500 overflow-hidden">
                                    {data.items[0].imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={data.items[0].imageUrl!}
                                            alt={data.items[0].title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>이미지</>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">
                                            {data.items[0].title}
                                        </div>
                                        {data.items[0].subtitle && (
                                            <div className="text-xs text-neutral-400 mt-0.5">
                                                {data.items[0].subtitle}
                                            </div>
                                        )}
                                        {data.items[0].description && (
                                            <div className="text-xs text-neutral-400 mt-0.5">
                                                {data.items[0].description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-sm font-semibold">
                                        {formatPrice(data.items[0].price)}
                                        <span className="ml-1 text-[11px] text-neutral-500">
                      (세금 포함가)
                    </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 선택한 스타 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-3">
                                선택한 스타
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-xs">
                                    {variant.charAt(0) || "S"}
                                </div>
                                <input
                                    className="bg-neutral-900 border border-neutral-700 rounded-full px-4 py-2 text-xs min-w-[140px]"
                                    placeholder="스타 이름을 입력해 주세요"
                                    value={variant}
                                    onChange={(e) =>
                                        setVariant(e.target.value)
                                    }
                                />
                            </div>
                        </section>

                        {/* 결제 수단 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-4">
                                결제
                            </div>
                            <div className="flex flex-col gap-3 text-sm">
                                <label className="flex flex-col gap-1 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            className="accent-red-500"
                                            checked={
                                                paymentMethod === "TOSS_QUICK"
                                            }
                                            onChange={() =>
                                                setPaymentMethod("TOSS_QUICK")
                                            }
                                        />
                                        <span>Toss 퀵계좌이체</span>
                                        <span className="ml-1 text-[11px] text-red-400">
                      혜택
                    </span>
                                    </div>
                                    <span className="ml-6 text-[11px] text-neutral-500">
                    0.5% 즉시 할인 (예시 문구)
                  </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="accent-red-500"
                                        checked={paymentMethod === "TOSS"}
                                        onChange={() =>
                                            setPaymentMethod("TOSS")
                                        }
                                    />
                                    <span>TOSS PAYMENTS</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-neutral-500">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="accent-red-500"
                                        checked={paymentMethod === "EXIMBAY"}
                                        onChange={() =>
                                            setPaymentMethod("EXIMBAY")
                                        }
                                    />
                                    <span>Eximbay</span>
                                </label>

                                <p className="mt-2 text-[11px] text-neutral-500">
                                    토스 퀵계좌이체는 원화(KRW) 결제만
                                    지원됩니다.
                                    <br />
                                    결제 시 할인이 자동 적용됩니다.
                                </p>
                            </div>
                        </section>

                        {/* T1 Point */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm font-semibold mb-3">
                                T1 Point
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    className="flex-1 bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                    type="number"
                                    min={0}
                                    value={pointInput}
                                    onChange={(e) =>
                                        setPointInput(e.target.value)
                                    }
                                />
                                <button className="px-4 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-400 cursor-not-allowed">
                                    최대 사용
                                </button>
                            </div>
                            <div className="mt-1 text-[11px] text-neutral-500">
                                보유 <span className="font-semibold">0P</span>
                            </div>
                        </section>

                        {/* 결제 금액 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm font-semibold mb-3">
                                결제 금액
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    총 상품 금액
                  </span>
                                    <span>
                    {formatPrice(data.totalAmount)}
                  </span>
                                </div>
                                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    0P 사용
                  </span>
                                    <span>-0원</span>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-neutral-400">
                  총 결제 금액
                </span>
                                <span className="text-2xl font-semibold">
                  {formatPrice(data.totalAmount)}
                </span>
                            </div>

                            <ul className="mt-4 text-[11px] text-neutral-500 leading-relaxed list-disc list-inside">
                                <li>
                                    이용권 구매 후 POP에 입장하였거나, 첫 결제 후
                                    7일이 지나면 구매확정 처리되어 청약철회가
                                    불가합니다. (예시 문구)
                                </li>
                                <li>
                                    토스 퀵계좌이체는 원화(KRW) 결제만
                                    지원됩니다.
                                </li>
                            </ul>
                        </section>

                        {/* 약관 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm font-semibold mb-3">
                                약관
                            </div>
                            <div className="flex flex-col gap-2 text-xs">
                                <button className="w-full flex justify-between items-center bg-black border border-neutral-800 rounded-xl px-4 py-2 hover:bg-neutral-900">
                                    <span>(필수) t1.fan 커뮤니티 약관</span>
                                    <span className="text-neutral-500 text-[11px]">
                    &gt;
                  </span>
                                </button>
                                <button className="w-full flex justify-between items-center bg-black border border-neutral-800 rounded-xl px-4 py-2 hover:bg-neutral-900">
                  <span>
                    (필수) 개인정보 수집 및 이용 안내
                  </span>
                                    <span className="text-neutral-500 text-[11px]">
                    &gt;
                  </span>
                                </button>
                                <button className="w-full flex justify-between items-center bg-black border border-neutral-800 rounded-xl px-4 py-2 hover:bg-neutral-900">
                  <span>
                    (필수) 결제서비스 이용약관
                  </span>
                                    <span className="text-neutral-500 text-[11px]">
                    &gt;
                  </span>
                                </button>
                            </div>
                        </section>

                        {/* 최종 동의 + 결제 버튼 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer mb-4">
                                <input
                                    type="checkbox"
                                    className="accent-red-500"
                                    checked={agreeAll}
                                    onChange={(e) =>
                                        setAgreeAll(e.target.checked)
                                    }
                                />
                                <span>
                  주문 내용과 약관에 동의합니다.
                </span>
                            </label>

                            <button
                                className="w-full mt-2 h-12 rounded-xl bg-[#f04923] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e03f19]"
                                disabled={!canPay}
                                onClick={handlePay}
                            >
                                결제하기
                            </button>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
