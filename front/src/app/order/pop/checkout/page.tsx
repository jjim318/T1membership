// src/app/order/pop/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

// 🔥 /member/readOne 응답 (필요한 것만)
interface MemberReadOneRes {
    memberEmail: string;
    memberName?: string;      // 실제 DTO 필드명에 맞게 조정 (memberNickName 쓰면 거기로 바꾸면 됨)
    memberNickName?: string;
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

    // 1) URL 쿼리에서 POP 정보 가져오기
    const {
        popId,
        quantity,
        itemName,
        price,
        thumbnail,
        initialVariant,
    } = useMemo(() => {
        const popIdParam =
            searchParams.get("popId") ?? searchParams.get("itemNo");
        const qtyParam =
            searchParams.get("qty") ?? searchParams.get("quantity");
        const itemNameParam = searchParams.get("itemName") ?? "";
        const priceParam = searchParams.get("price");
        const thumbParam = searchParams.get("thumbnail") ?? "";
        const variantParam = searchParams.get("variant") ?? "";

        return {
            popId: popIdParam ? Number(popIdParam) : null,
            quantity: qtyParam ? Number(qtyParam) : 1,
            itemName: itemNameParam,
            price: priceParam ? Number(priceParam) : 0,
            thumbnail: thumbParam || null,
            initialVariant: variantParam,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()]);

    // 2) 화면 상태
    const [variant, setVariant] = useState<string>(initialVariant);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>("TOSS_QUICK");

    const [pointInput, setPointInput] = useState("0");

    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreeCommunity, setAgreeCommunity] = useState(false);
    const [agreePaymentTerms, setAgreePaymentTerms] = useState(false);
    const [agreeAll, setAgreeAll] = useState(false);

    // 🔥 JWT 토큰 기반 로그인 유저 정보 (백엔드 /member/readOne 호출)
    const [buyerName, setBuyerName] = useState<string>("");
    const [buyerEmail, setBuyerEmail] = useState<string>("");

    // 3) 전체 동의 체크박스 연동
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

    const totalAmount = useMemo(() => {
        if (!price || !quantity) return 0;
        return price * quantity;
    }, [price, quantity]);

    const canPay =
        !!popId &&
        price > 0 &&
        !!itemName &&
        !!variant.trim() &&
        !!buyerEmail &&          // 로그인 유저 정보까지 있어야 결제 가능
        agreePrivacy &&
        agreeCommunity &&
        agreePaymentTerms;

    // 4) 기본 값 검증
    useEffect(() => {
        if (!popId || price <= 0 || !itemName) {
            setErrorMsg(
                "잘못된 접근입니다. POP 상품 페이지에서 다시 시도해 주세요."
            );
        } else {
            setErrorMsg(null);
        }
    }, [popId, price, itemName]);

    // 5) 🔥 /member/readOne 으로 로그인 유저 정보 가져오기 (JWT 사용)
    useEffect(() => {
        const loadMember = async () => {
            try {
                const res =
                    await apiClient.get<ApiResult<MemberReadOneRes>>(
                        "/member/readOne",
                    );

                if (!res.data.isSuccess) {
                    throw new Error(
                        res.data.resMessage ||
                        "회원 정보를 불러오지 못했습니다."
                    );
                }

                const m = res.data.result;
                setBuyerEmail(m.memberEmail);
                // 닉네임/이름 중 하나 선택해서 사용
                setBuyerName(
                    m.memberNickName ||
                    m.memberName ||
                    m.memberEmail.split("@")[0]
                );
            } catch (err) {
                // 401이면 로그인 페이지로 보내버림
                if (
                    axios.isAxiosError(err) &&
                    err.response?.status === 401
                ) {
                    alert("로그인이 필요합니다.");
                    router.push("/login");
                    return;
                }

                console.error("회원 정보 조회 실패 =", err);
                setErrorMsg(
                    extractError(
                        err,
                        "회원 정보를 불러오지 못했습니다."
                    )
                );
            }
        };

        loadMember();
    }, [router]);

    const validatePop = (): string | null => {
        if (!popId) return "popId 가 필요합니다.";
        if (!variant.trim())
            return "선택한 스타(옵션)를 입력해 주세요.";
        return null;
    };

    // ===== 주문 생성 (POST /order/POP) =====
    const createPopOrder = async (): Promise<number> => {
        const err = validatePop();
        if (err) throw new Error(err);

        const body = {
            popId,
            quantity,
            variant: variant || undefined,
        };

        const res = await apiClient.post<ApiResult<CreateOrderRes>>(
            "/order/POP",
            body
        );

        if (!res.data.isSuccess) {
            throw new Error(
                res.data.resMessage || "POP 주문 생성에 실패했습니다."
            );
        }

        return res.data.result.orderNo;
    };

    // ===== Toss prepare (POST /api/pay/toss/prepare) =====
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
        if (paymentMethod === "EXIMBAY") {
            alert("Eximbay 결제는 아직 준비 중입니다.");
            return;
        }

        if (!canPay) {
            alert("주문 정보, 스타 선택, 약관 동의를 모두 확인해 주세요.");
            return;
        }

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
                // 형님 프로젝트 설정에 맞는 URL로
                successUrl: `${window.location.origin}/toss/success`,
                failUrl: `${window.location.origin}/toss/fail`,
                customerEmail: buyerEmail || undefined,
                customerName: buyerName || undefined,
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

                {errorMsg && (
                    <div className="text-sm text-red-400 mb-6">
                        {errorMsg}
                    </div>
                )}

                {!errorMsg && (
                    <div className="flex flex-col gap-8">
                        {/* 주문자 (JWT 기반 /member/readOne) */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm text-neutral-400 mb-1">
                                        주문자
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {buyerName || "회원 정보 로딩 중"}
                                    </div>
                                    <div className="text-xs text-neutral-400 mt-1">
                                        {buyerEmail || ""}
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
                                    {thumbnail ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={thumbnail}
                                            alt={itemName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>이미지</>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">
                                            {itemName}
                                        </div>
                                        <div className="mt-2 text-sm font-semibold">
                                            {formatPrice(price)}
                                            <span className="ml-1 text-[11px] text-neutral-500">
                                                (세금 포함가)
                                            </span>
                                        </div>
                                        <div className="mt-1 text-xs text-neutral-400">
                                            수량 {quantity}개
                                        </div>
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
                                        {formatPrice(totalAmount)}
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
                                    {formatPrice(totalAmount)}
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
