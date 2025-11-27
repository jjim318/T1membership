"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

// ===== 타입 =====
type PaymentMethod = "CARD" | "ACCOUNT";

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

interface GoodsForm {
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverDetailAddress: string;
    receiverZipCode: string;
    memo: string;
}

// 백엔드 DTO에 대응
interface CreateGoodsOrderBody {
    cartNo: number;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverDetailAddress: string;
    receiverZipCode: string;
    memo?: string;
    // 단건 주문
    itemId?: number | null;
    quantity?: number;
    // 장바구니 주문
    cartItemIds?: number[];
}

// TossPayments 글로벌 타입 정의
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

const getTossClient = (): TossClient | null => {
    if (typeof window === "undefined") return null;
    const w = window as TossWindow;
    if (!w.TossPayments) return null;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
    if (!clientKey) return null;
    return w.TossPayments(clientKey);
};

type GoodsCheckoutQuery = {
    itemId?: number;
    quantity?: number;
    cartNo?: number;
    cartItemIds?: string; // "1,2,3"
};

// ===== 컴포넌트 =====
export default function GoodsCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 단건 구매용
    const itemIdParam = searchParams.get("itemId");
    const qtyParam = searchParams.get("qty");
    const itemId = itemIdParam ? Number(itemIdParam) : null;
    const quantity = qtyParam ? Number(qtyParam) : 1;

    // 장바구니 구매용
    const cartNoParam = searchParams.get("cartNo");
    const cartItemIdsParam = searchParams.get("cartItemIds"); // "1,2,3"
    const cartNo = cartNoParam ? Number(cartNoParam) : 0;
    const cartItemIds: number[] =
        cartItemIdsParam && cartItemIdsParam.length > 0
            ? cartItemIdsParam
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => !Number.isNaN(n))
            : [];

    const [data, setData] = useState<CheckoutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>("CARD");

    const [goodsForm, setGoodsForm] = useState<GoodsForm>({
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
        receiverDetailAddress: "",
        receiverZipCode: "",
        memo: "",
    });

    // 약관
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreePaymentTerms, setAgreePaymentTerms] =
        useState(false);
    const [agreeAll, setAgreeAll] = useState(false);

    useEffect(() => {
        if (agreeAll) {
            setAgreePrivacy(true);
            setAgreePaymentTerms(true);
        }
    }, [agreeAll]);

    useEffect(() => {
        if (agreePrivacy && agreePaymentTerms) {
            setAgreeAll(true);
        } else {
            setAgreeAll(false);
        }
    }, [agreePrivacy, agreePaymentTerms]);

    const canPay =
        !!data && agreePrivacy && agreePaymentTerms;

    // ===== 화면용 데이터 – 카트/프리뷰 API에서 조회 =====
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const params: GoodsCheckoutQuery = {};
                if (itemId) {
                    params.itemId = itemId;
                    params.quantity = quantity;
                }
                if (cartNo) {
                    params.cartNo = cartNo;
                }
                if (cartItemIds.length > 0) {
                    params.cartItemIds = cartItemIds.join(",");
                }

                // 형님이 나중에 구현할 카트/프리뷰 API
                // GET /checkout/goods?itemId=...&quantity=...&cartNo=...&cartItemIds=1,2
                const res =
                    await apiClient.get<ApiResult<CheckoutData>>(
                        "/checkout/goods",
                        { params }
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
    }, [itemId, quantity, cartNo, cartItemIds]);

    // ===== 폼 입력 =====
    const handleGoodsChange = (
        field: keyof GoodsForm,
        value: string
    ) => {
        setGoodsForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const validateGoodsForm = (): string | null => {
        if (!goodsForm.receiverName.trim()) {
            return "받는 분 이름을 입력해 주세요.";
        }
        if (!goodsForm.receiverPhone.trim()) {
            return "전화번호를 입력해 주세요.";
        }
        if (
            !/^[0-9\-]{9,13}$/.test(goodsForm.receiverPhone.trim())
        ) {
            return "전화번호는 숫자/하이픈 포함 9~13자리로 입력해 주세요.";
        }
        if (!goodsForm.receiverZipCode.trim()) {
            return "우편번호를 입력해 주세요.";
        }
        if (!goodsForm.receiverAddress.trim()) {
            return "주소를 입력해 주세요.";
        }
        if (!goodsForm.receiverDetailAddress.trim()) {
            return "상세 주소를 입력해 주세요.";
        }
        return null;
    };

    // ===== 주문 생성 =====
    const createGoodsOrder = async (): Promise<number> => {
        if (!data) throw new Error("결제 데이터가 없습니다.");

        const err = validateGoodsForm();
        if (err) throw new Error(err);

        if (!itemId && cartItemIds.length === 0) {
            throw new Error(
                "itemId 또는 cartItemIds 가 필요합니다."
            );
        }

        const body: CreateGoodsOrderBody = {
            cartNo,
            receiverName: goodsForm.receiverName,
            receiverPhone: goodsForm.receiverPhone,
            receiverAddress: goodsForm.receiverAddress,
            receiverDetailAddress: goodsForm.receiverDetailAddress,
            receiverZipCode: goodsForm.receiverZipCode,
        };

        if (goodsForm.memo.trim().length > 0) {
            body.memo = goodsForm.memo;
        }

        if (cartItemIds.length > 0) {
            body.cartItemIds = cartItemIds;
        } else {
            body.itemId = itemId;
            body.quantity = quantity;
        }

        const res = await apiClient.post<CreateOrderRes>(
            "/order/goods",
            body
        );
        return res.data.orderNo;
    };

    // ===== Toss prepare =====
    const prepareToss = async (
        orderNo: number
    ): Promise<TossPrepareResponse["data"]> => {
        const method =
            paymentMethod === "ACCOUNT" ? "ACCOUNT" : "CARD";

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
            alert("필수 약관에 동의해 주세요.");
            return;
        }
        if (!data) return;

        try {
            const orderNo = await createGoodsOrder();
            const prepared = await prepareToss(orderNo);

            const tossClient = getTossClient();
            if (!tossClient) {
                alert("Toss 스크립트 또는 클라이언트 키가 없습니다.");
                return;
            }

            const payType: TossPayType =
                paymentMethod === "ACCOUNT" ? "TRANSFER" : "CARD";

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

                        {/* 배송 정보 */}
                        <section className="border-t border-neutral-800 pt-6 text-xs">
                            <div className="text-sm text-neutral-400 mb-3">
                                배송 정보
                            </div>

                            <div className="flex flex-col gap-3">
                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        받는 분 이름{" "}
                                        <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverName}
                                        onChange={(e) =>
                                            handleGoodsChange(
                                                "receiverName",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        전화번호{" "}
                                        <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        placeholder="숫자와 하이픈(-)만 입력"
                                        value={goodsForm.receiverPhone}
                                        onChange={(e) =>
                                            handleGoodsChange(
                                                "receiverPhone",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        우편번호{" "}
                                        <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverZipCode}
                                        onChange={(e) =>
                                            handleGoodsChange(
                                                "receiverZipCode",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        주소{" "}
                                        <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverAddress}
                                        onChange={(e) =>
                                            handleGoodsChange(
                                                "receiverAddress",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        상세 주소{" "}
                                        <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverDetailAddress}
                                        onChange={(e) =>
                                            handleGoodsChange(
                                                "receiverDetailAddress",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        요청 사항
                                    </div>
                                    <textarea
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm h-16 resize-none"
                                        value={goodsForm.memo}
                                        onChange={(e) =>
                                            handleGoodsChange(
                                                "memo",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 주문 상품 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-4">
                                주문 상품
                            </div>
                            <div className="flex flex-col gap-4">
                                {data.items.map((item) => (
                                    <div
                                        key={item.itemNo}
                                        className="flex gap-4"
                                    >
                                        <div className="w-24 h-32 bg-neutral-900 rounded-lg flex items-center justify-center text-[11px] text-neutral-500 overflow-hidden">
                                            {item.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <>이미지</>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="text-sm font-semibold">
                                                    {item.title}
                                                </div>
                                                {item.subtitle && (
                                                    <div className="text-xs text-neutral-400 mt-0.5">
                                                        {item.subtitle}
                                                    </div>
                                                )}
                                                {item.description && (
                                                    <div className="text-xs text-neutral-500 mt-0.5">
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 text-sm font-semibold">
                                                {formatPrice(item.price)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 결제 수단 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-4">
                                결제
                            </div>
                            <div className="flex flex-col gap-3 text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="accent-red-500"
                                        checked={paymentMethod === "CARD"}
                                        onChange={() =>
                                            setPaymentMethod("CARD")
                                        }
                                    />
                                    <span>TOSS PAYMENTS</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-neutral-500">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="accent-red-500"
                                        checked={paymentMethod === "ACCOUNT"}
                                        onChange={() =>
                                            setPaymentMethod("ACCOUNT")
                                        }
                                    />
                                    <span>
                    Eximbay
                    <span className="ml-1 text-[11px] text-neutral-500">
                      {" "}
                        - 원화(KRW)로만 결제 가능합니다.
                    </span>
                  </span>
                                </label>
                            </div>
                        </section>

                        {/* 결제 금액 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm font-semibold mb-2">
                                결제 금액
                            </div>
                            <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-neutral-400">
                  총 결제 금액
                </span>
                                <span className="text-2xl font-semibold">
                  {formatPrice(data.totalAmount)}
                </span>
                            </div>
                        </section>

                        {/* 약관 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm font-semibold mb-3">
                                약관
                            </div>
                            <div className="flex flex-col gap-2 text-xs">
                                <button className="w-full flex justify-between items-center bg-black border border-neutral-800 rounded-xl px-4 py-2 hover:bg-neutral-900">
                                    <span>(필수) 개인정보 수집 및 이용 안내</span>
                                    <span className="text-neutral-500 text-[11px]">
                    &gt;
                  </span>
                                </button>
                                <button className="w-full flex justify-between items-center bg-black border border-neutral-800 rounded-xl px-4 py-2 hover:bg-neutral-900">
                                    <span>(필수) 결제서비스 이용약관</span>
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
