"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

// ===== 타입 정의 =====
type MembershipPayType = "CARD" | "ACCOUNT";

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

// 멤버십 정보 모달 폼
interface MembershipForm {
    name: string;
    birth: string; // YYYY-MM-DD
    countryCode: string; // "+82"
    phone: string; // 숫자만
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

// ===== 컴포넌트 =====
export default function MembershipCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 쿼리 파라미터: 플랜/개월/자동결제 여부
    const planCode =
        searchParams.get("planCode") ?? "T1-2025-MONTHLY";
    const months = Number(searchParams.get("months") ?? "1");
    const autoRenew =
        searchParams.get("autoRenew") === "true";

    const [data, setData] = useState<CheckoutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] =
        useState<MembershipPayType>("CARD");

    // 멤버십 정보 모달
    const [showMembershipModal, setShowMembershipModal] =
        useState(false);
    const [membershipApplied, setMembershipApplied] =
        useState(false);

    const [membershipForm, setMembershipForm] =
        useState<MembershipForm>({
            name: "",
            birth: "",
            countryCode: "+82",
            phone: "",
        });

    // 약관 동의
    const [agreePrivacy, setAgreePrivacy] = useState(false); // 개인정보
    const [agreePaymentTerms, setAgreePaymentTerms] =
        useState(false); // 결제서비스 이용약관
    const [
        agreeMembershipPrivacy,
        setAgreeMembershipPrivacy,
    ] = useState(false); // 멤버십 개인정보
    const [agreeAll, setAgreeAll] = useState(false);

    useEffect(() => {
        if (agreeAll) {
            setAgreePrivacy(true);
            setAgreePaymentTerms(true);
            setAgreeMembershipPrivacy(true);
        }
    }, [agreeAll]);

    useEffect(() => {
        if (
            agreePrivacy &&
            agreePaymentTerms &&
            agreeMembershipPrivacy
        ) {
            setAgreeAll(true);
        } else {
            setAgreeAll(false);
        }
    }, [agreePrivacy, agreePaymentTerms, agreeMembershipPrivacy]);

    const canPay =
        !!data &&
        membershipApplied &&
        agreePrivacy &&
        agreePaymentTerms &&
        agreeMembershipPrivacy;

    // ===== 프리뷰 데이터 호출 (/checkout/membership) =====
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                // 형님이 백엔드에 만들 /checkout/membership
                const res =
                    await apiClient.get<ApiResult<CheckoutData>>(
                        "/checkout/membership",
                        {
                            params: {
                                planCode,
                                months,
                                autoRenew,
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
    }, [planCode, months, autoRenew]);

    // ===== 멤버십 모달 입력 =====
    const handleMembershipChange = (
        field: keyof MembershipForm,
        value: string
    ) => {
        setMembershipForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const validateMembershipForm = (): string | null => {
        if (!membershipForm.name.trim()) {
            return "이름을 입력해 주세요.";
        }
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(membershipForm.birth.trim())
        ) {
            return "생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.";
        }
        if (!membershipForm.phone.trim()) {
            return "전화번호를 입력해 주세요.";
        }
        if (!/^\d+$/.test(membershipForm.phone.trim())) {
            return "전화번호는 숫자만 입력해 주세요.";
        }
        return null;
    };

    const applyMembershipInfo = () => {
        const err = validateMembershipForm();
        if (err) {
            alert(err);
            return;
        }
        setMembershipApplied(true);
        setShowMembershipModal(false);
    };

    // ===== 주문 생성 (/order/membership) =====
    const createMembershipOrder = async (): Promise<number> => {
        if (!data) throw new Error("결제 데이터가 없습니다.");

        const err = validateMembershipForm();
        if (err) throw new Error(err);

        const body = {
            planCode,
            months,
            autoRenew,
            membershipPayType: paymentMethod as MembershipPayType,
            memberBirth: membershipForm.birth,
            memberName: membershipForm.name,
            memberPhone: `${membershipForm.countryCode}${membershipForm.phone}`,
        };

        const res = await apiClient.post<CreateOrderRes>(
            "/order/membership",
            body
        );
        return res.data.orderNo;
    };

    // ===== Toss prepare (/api/pay/toss/prepare) =====
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
            alert(
                "멤버십 정보와 필수 약관에 모두 동의해 주세요."
            );
            if (!membershipApplied) {
                setShowMembershipModal(true);
            }
            return;
        }
        if (!data) return;

        try {
            const orderNo = await createMembershipOrder();
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

                        {/* 멤버십 카드 (주문 상품) */}
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
                                        <>MEMBERSHIP</>
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
                                            <div className="text-xs text-neutral-500 mt-0.5 whitespace-pre-line">
                                                {data.items[0].description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-sm font-semibold">
                                        {formatPrice(data.items[0].price)}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 멤버십 정보 섹션 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-sm text-neutral-400">
                                    멤버십 정보
                                </div>
                                <button
                                    className="px-3 py-1.5 text-xs rounded-full border border-neutral-700 hover:bg-neutral-900"
                                    onClick={() =>
                                        setShowMembershipModal(true)
                                    }
                                >
                                    정보 입력/수정
                                </button>
                            </div>

                            <div className="text-xs text-neutral-300 space-y-1">
                                <div>
                  <span className="text-neutral-500 mr-2">
                    이름
                  </span>
                                    <span>
                    {membershipApplied
                        ? membershipForm.name
                        : "입력 필요"}
                  </span>
                                </div>
                                <div>
                  <span className="text-neutral-500 mr-2">
                    생년월일
                  </span>
                                    <span>
                    {membershipApplied
                        ? membershipForm.birth
                        : "입력 필요 (YYYY-MM-DD)"}
                  </span>
                                </div>
                                <div>
                  <span className="text-neutral-500 mr-2">
                    전화번호
                  </span>
                                    <span>
                    {membershipApplied
                        ? `${membershipForm.countryCode} ${membershipForm.phone}`
                        : "입력 필요"}
                  </span>
                                </div>
                            </div>

                            {!membershipApplied && (
                                <div className="mt-2 text-[11px] text-red-400">
                                    멤버십 정보를 입력해야 결제가 가능합니다.
                                </div>
                            )}
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
                                    <span>(필수) T1 Membership 개인정보 수집 및 이용 안내</span>
                                    <span className="text-neutral-500 text-[11px]">
                    &gt;
                  </span>
                                </button>
                                <button className="w-full flex justify-between items-center bg-black border border-neutral-800 rounded-xl px-4 py-2 hover:bg-neutral-900">
                                    <span>(필수) 일반 개인정보 수집 및 이용 안내</span>
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
                            <div className="flex flex-col gap-2 text-xs mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="accent-red-500"
                                        checked={agreeMembershipPrivacy}
                                        onChange={(e) =>
                                            setAgreeMembershipPrivacy(
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span>
                    (필수) T1 Membership 개인정보 수집 및 이용
                    안내에 동의합니다.
                  </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="accent-red-500"
                                        checked={agreePrivacy}
                                        onChange={(e) =>
                                            setAgreePrivacy(e.target.checked)
                                        }
                                    />
                                    <span>
                    (필수) 개인정보 수집 및 이용 안내에
                    동의합니다.
                  </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="accent-red-500"
                                        checked={agreePaymentTerms}
                                        onChange={(e) =>
                                            setAgreePaymentTerms(
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span>
                    (필수) 결제서비스 이용약관에 동의합니다.
                  </span>
                                </label>
                            </div>

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
                  주문 내용과 약관에 모두 동의합니다.
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

            {/* ===== 멤버십 정보 입력 모달 ===== */}
            {showMembershipModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl px-6 py-6 text-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-semibold">
                                멤버십 정보 입력
                            </h2>
                            <button
                                className="text-xs text-neutral-400 hover:text-neutral-200"
                                onClick={() =>
                                    setShowMembershipModal(false)
                                }
                            >
                                닫기
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-xs">
                            <div>
                                <div className="mb-1 text-neutral-300">
                                    이름{" "}
                                    <span className="text-red-500">(필수)</span>
                                </div>
                                <input
                                    className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                    value={membershipForm.name}
                                    onChange={(e) =>
                                        handleMembershipChange(
                                            "name",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <div className="mb-1 text-neutral-300">
                                    생년월일{" "}
                                    <span className="text-red-500">(필수)</span>
                                    <span className="ml-1 text-[11px] text-neutral-500">
                    예) 1998-11-03
                  </span>
                                </div>
                                <input
                                    className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                    placeholder="YYYY-MM-DD"
                                    value={membershipForm.birth}
                                    onChange={(e) =>
                                        handleMembershipChange(
                                            "birth",
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
                                <div className="flex gap-2">
                                    <select
                                        className="min-w-[80px] bg-black border border-neutral-700 rounded-lg px-2 py-2 text-sm"
                                        value={membershipForm.countryCode}
                                        onChange={(e) =>
                                            handleMembershipChange(
                                                "countryCode",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="+82">+82</option>
                                        <option value="+81">+81</option>
                                        <option value="+1">+1</option>
                                    </select>
                                    <input
                                        className="flex-1 bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        placeholder="숫자만 입력"
                                        value={membershipForm.phone}
                                        onChange={(e) =>
                                            handleMembershipChange(
                                                "phone",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                            <button
                                className="flex-1 h-10 rounded-xl bg-neutral-800 text-xs hover:bg-neutral-700"
                                onClick={() =>
                                    setShowMembershipModal(false)
                                }
                            >
                                취소
                            </button>
                            <button
                                className="flex-1 h-10 rounded-xl bg-[#f04923] text-xs font-semibold hover:bg-[#e03f19]"
                                onClick={applyMembershipInfo}
                            >
                                적용하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
