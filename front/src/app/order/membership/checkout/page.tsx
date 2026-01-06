// src/app/order/membership/checkout/page.tsx
"use client";

import { useState, useEffect, ChangeEvent, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

type Currency = "KRW" | "USD";
type PayMethod = "TOSS_ACCOUNT" | "TOSS_PAYMENTS" | "EXIMBAY";
type PayType = "ONE_TIME" | "YEARLY" | "RECURRING";

/** 공통 ApiResult */
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface MemberInfo {
    memberEmail: string;
    memberName: string;
}

/**
 * 백엔드 CreateMembershipOrderReq에 맞춘 타입
 * planCode + months + autoRenew 를 서버가 해석해서 MembershipPayType 결정
 */
interface CreateMembershipOrderReq {
    type: "MEMBERSHIP";
    planCode: string;
    months: number;
    autoRenew: boolean;
    memberBirth: string;
    memberName: string;
    memberPhone: string;
}

/**
 * 백엔드 CreateOrderRes (ApiResult.result)
 * ✅ 보안: 프론트가 금액을 믿지 않더라도, 서버가 계산한 금액을 함께 내려주면 UI 표시가 정확해짐
 * - orderTotalPrice는 BigDecimal이므로 string/number 둘 다 올 수 있어 방어
 */
interface CreateOrderRes {
    orderNo: number;
    checkoutUrl?: string;
    paymentUrl?: string;

    // (있으면 표시용으로 사용)
    orderTotalPrice?: number | string;
}

/** ===== JWT에서 이메일만 복구(표시/보조용) ===== */
function extractEmailFromJwt(token: string | null): string | null {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payloadPart.padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
        const json = atob(padded);
        const payload = JSON.parse(json);

        return payload.sub ?? payload.memberEmail ?? null;
    } catch (e) {
        console.error("[JWT] decode 실패 =", e);
        return null;
    }
}

/** 안전한 months 파싱 */
function parseMonths(raw: string | null): number {
    if (!raw) return 1;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
}

/** 숫자만 */
function onlyDigits(v: string) {
    return v.replace(/\D/g, "");
}

/** YYYY-MM-DD 형식 검증(간단) */
function isValidBirth(v: string) {
    // 2000-01-23 같은 형태
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [y, m, d] = v.split("-").map((x) => Number(x));
    if (y < 1900 || y > 2100) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    return true;
}

/** payType → 서버가 해석 가능한 planCode/autoRenew/months 기본값으로 변환 */
function resolvePlanFromPayType(payType: PayType): { planCode: string; autoRenew: boolean; months: number } {
    // ⚠️ 형님 MembershipOrderCreator 규칙:
    // - autoRenew=true → RECURRING
    // - planCode contains "YEAR" → YEARLY
    // - planCode contains "MONTH" → ONE_TIME (기간형/월 단건)
    // 그래서 payType에 맞춰 문자열 포함되도록 만든다.
    switch (payType) {
        case "RECURRING":
            return { planCode: "T1-2025-MONTHLY", autoRenew: true, months: 1 };
        case "YEARLY":
            return { planCode: "T1-2025-YEARLY", autoRenew: false, months: 12 };
        case "ONE_TIME":
        default:
            return { planCode: "T1-2025-MONTHLY", autoRenew: false, months: 1 };
    }
}

/** BigDecimal/문자열/숫자 섞여 와도 안전하게 number로 */
function toNumberSafe(v: unknown): number {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

export default function MembershipCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ========= 1) URL 파라미터: 두 가지 케이스 지원 =========
    // (A) 기존: planCode/months/autoRenew/itemName/price
    // (B) 남의 PC 케이스: payType=RECURRING 만 오는 경우

    const payTypeParam = (searchParams.get("payType") ?? "").toUpperCase() as PayType | "";
    const urlPlanCode = searchParams.get("planCode") ?? "";
    const urlMonths = parseMonths(searchParams.get("months"));
    const urlAutoRenew = (searchParams.get("autoRenew") ?? "false") === "true";
    const urlItemName = searchParams.get("itemName") ?? "T1 Membership";

    // ❌ price는 보안상 신뢰하지 않음 (표시용으로만)
    const urlPrice = Number(searchParams.get("price") ?? "0");

    // ========= 2) 실제 서버로 보낼 주문 파라미터(보안 기준) =========
    // - planCode가 있으면 그걸 우선
    // - 없고 payType만 있으면 payType 기반으로 planCode/autoRenew/months를 생성
    const resolved = useMemo(() => {
        if (urlPlanCode && urlPlanCode.trim() !== "") {
            return {
                planCode: urlPlanCode.trim(),
                months: urlMonths,
                autoRenew: urlAutoRenew,
            };
        }
        if (payTypeParam === "RECURRING" || payTypeParam === "YEARLY" || payTypeParam === "ONE_TIME") {
            return resolvePlanFromPayType(payTypeParam);
        }
        // 둘 다 없으면 실패 상태
        return { planCode: "", months: 1, autoRenew: false };
    }, [urlPlanCode, urlMonths, urlAutoRenew, payTypeParam]);

    const planCode = resolved.planCode;
    const months = resolved.months;
    const autoRenew = resolved.autoRenew;
    const itemName = urlItemName;

    // ========= UI 상태 =========
    const [currency, setCurrency] = useState<Currency>("KRW");
    const [payMethod, setPayMethod] = useState<PayMethod>("TOSS_ACCOUNT");
    const [usePoint, setUsePoint] = useState(0);

    // 주문자 정보(표시용)
    const [ordererLastName, setOrdererLastName] = useState("");
    const [ordererFirstName, setOrdererFirstName] = useState("");
    const [ordererEmail, setOrdererEmail] = useState("");
    const [showOrdererModal, setShowOrdererModal] = useState(false);

    // 멤버십 정보(필수)
    const [showMemberInfoModal, setShowMemberInfoModal] = useState(false);
    const [memberName, setMemberName] = useState("");
    const [memberBirth, setMemberBirth] = useState("");
    const [memberPhoneCountry, setMemberPhoneCountry] = useState("+82");
    const [memberPhone, setMemberPhone] = useState("");
    const [memberInfoSaved, setMemberInfoSaved] = useState(false);

    const [agreeAll, setAgreeAll] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    /**
     * 표시용 금액:
     * - urlPrice가 있으면 보여주되(편의)
     * - 없으면 "계산 중/서버 확정" 느낌으로 0 표시
     * 실무에서는 서버에서 예상 금액 조회 API를 따로 두는 게 베스트지만
     * 지금은 주문 생성 응답(orderTotalPrice)로 확정 표시를 하게 구성.
     */
    const displayBasePrice = Math.max(urlPrice, 0);
    const totalAmount = Math.max(displayBasePrice - usePoint, 0);

    // ===== 로그인 회원 정보 불러오기 (주문자 카드) =====
    useEffect(() => {
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("accessToken");
        if (!token) return;

        let email = localStorage.getItem("memberEmail");
        if (!email) {
            const fromJwt = extractEmailFromJwt(token);
            if (fromJwt) {
                email = fromJwt;
                localStorage.setItem("memberEmail", fromJwt);
                console.log("[membership checkout] JWT에서 email 복구 =", fromJwt);
            }
        }

        // 이메일 없더라도 readOne은 accessToken으로 되니 그냥 호출
        const load = async () => {
            try {
                const res = await apiClient.get<ApiResult<MemberInfo>>("/member/readOne");
                if (!res.data.isSuccess) {
                    console.warn("[membership checkout] 회원 조회 실패 =", res.data.resMessage);
                    return;
                }

                const info = res.data.result;
                const name = info.memberName ?? "";

                const parts = name.trim().split(" ");
                if (parts.length >= 2) {
                    setOrdererLastName(parts[0]);
                    setOrdererFirstName(parts.slice(1).join(" "));
                } else {
                    setOrdererLastName("");
                    setOrdererFirstName(name);
                }
                setOrdererEmail(info.memberEmail ?? "");
            } catch (e) {
                console.error("[membership checkout] 회원 정보 조회 중 오류", e);
            }
        };

        load();
    }, []);

    const handleChangeUsePoint = (e: ChangeEvent<HTMLInputElement>) => {
        const v = Number(onlyDigits(e.target.value) || "0");
        setUsePoint(v);
    };

    const handleSubmit = async () => {
        // ✅ 보안/정합성: 프론트 price로 막지 않는다. planCode(또는 payType에서 생성된 planCode)가 핵심.
        if (!planCode) {
            alert("주문 정보가 올바르지 않습니다. 다시 시도해 주세요.");
            return;
        }

        if (!memberInfoSaved) {
            alert("멤버십 정보를 먼저 입력해 주세요.");
            return;
        }

        // 입력 검증(최소)
        if (!memberName.trim()) {
            alert("이름을 입력해 주세요.");
            return;
        }
        if (!isValidBirth(memberBirth.trim())) {
            alert("생년월일 형식이 올바르지 않습니다. 예) 2000-01-23");
            return;
        }
        if (onlyDigits(memberPhone).length < 8) {
            alert("전화번호를 정확히 입력해 주세요.");
            return;
        }

        if (!agreeAll) {
            alert("주문 내용과 약관에 모두 동의해 주세요.");
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);

            const normalizedPhone = `${memberPhoneCountry} ${onlyDigits(memberPhone)}`;

            const reqBody: CreateMembershipOrderReq = {
                type: "MEMBERSHIP",
                planCode,
                months,
                autoRenew,
                memberName: memberName.trim(),
                memberBirth: memberBirth.trim(),
                memberPhone: normalizedPhone,
            };

            console.log("[membership] 요청 바디 =", reqBody);

            const res = await apiClient.post<ApiResult<CreateOrderRes>>("/order/membership", reqBody);

            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage || "주문 생성 실패");
            }

            const { orderNo, checkoutUrl, paymentUrl, orderTotalPrice } = res.data.result;
            console.log("[membership] 주문 생성 성공 =", res.data.result);

            // ✅ 서버 확정 금액(있으면 로그/표시/추적에 도움)
            const confirmed = toNumberSafe(orderTotalPrice);
            if (confirmed > 0) {
                console.log("[membership] 서버 확정 금액 =", confirmed);
            }

            const redirectUrl = checkoutUrl || paymentUrl;
            if (redirectUrl) {
                window.location.href = redirectUrl;
                return;
            }

            console.warn("[membership] checkoutUrl 이 없어 /order/checkout 페이지로 이동합니다.");
            router.push(`/order/checkout/${orderNo}`);
        } catch (e: any) {
            console.error("[membership] 주문 생성 실패 =", e);

            const status = e?.response?.status;
            const serverMsg = e?.response?.data?.resMessage;
            const fallback = e?.message || "주문 처리 중 오류가 발생했습니다.";

            if (status) {
                alert(serverMsg ?? `서버 오류 (${status})`);
            } else {
                alert(fallback);
            }

            setErrorMsg(serverMsg || fallback);
        } finally {
            setSubmitting(false);
        }
    };

    const ordererDisplayName = `${ordererLastName} ${ordererFirstName}`.trim();

    return (
        <div className="min-h-screen bg-black text-zinc-100">
            <main className="mx-auto max-w-4xl px-4 pb-32 pt-10">
                {/* 제목 */}
                <header className="mb-8">
                    <h1 className="text-2xl font-semibold">결제하기</h1>
                    {/* 디버그/추적용(개발 중에만) */}
                    <p className="mt-2 text-xs text-zinc-500">
                        planCode: <span className="text-zinc-300">{planCode || "-"}</span>{" "}
                        / months: <span className="text-zinc-300">{months}</span>{" "}
                        / autoRenew: <span className="text-zinc-300">{String(autoRenew)}</span>
                    </p>
                </header>

                {/* 주문자 정보 */}
                <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold">주문자</h2>
                        <button
                            type="button"
                            onClick={() => setShowOrdererModal(true)}
                            className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-100"
                        >
                            변경
                        </button>
                    </div>

                    <div className="mt-4 space-y-1 text-sm">
                        <p>{ordererDisplayName || "주문자 이름"}</p>
                        <p className="text-zinc-400">{ordererEmail || "이메일@example.com"}</p>
                    </div>
                </section>

                {/* 멤버십 정보 */}
                <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                    <h2 className="text-sm font-semibold">멤버십 정보</h2>

                    <button
                        type="button"
                        onClick={() => setShowMemberInfoModal(true)}
                        className="mt-4 flex w-full items-center justify-between rounded-md border border-zinc-700 bg-black px-4 py-3 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">✏️</span>
                            <span>
                {memberInfoSaved
                    ? `${memberName} / ${memberBirth} / ${memberPhoneCountry} ${onlyDigits(memberPhone)}`
                    : "정보 입력"}
              </span>
                        </div>
                    </button>

                    <p className="mt-2 text-[11px] text-red-300">필수 입력 항목이에요.</p>
                </section>

                {/* 주문 상품 */}
                <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                    <h2 className="text-sm font-semibold">주문 상품</h2>

                    <div className="mt-4 flex items-center gap-4">
                        <div className="h-20 w-16 flex-shrink-0 rounded-lg bg-zinc-800" />
                        <div className="flex flex-1 flex-col gap-1 text-sm">
                            <p className="text-xs text-zinc-400">{planCode || "T1 Membership"}</p>
                            <p className="font-semibold">{itemName}</p>
                            <p className="text-xs text-zinc-400">{months}개월 이용</p>

                            {/* ✅ price는 표시용: 없으면 0원 표시(서버 확정은 결제 단계에서) */}
                            <p className="mt-1 text-base font-bold">
                                {displayBasePrice > 0 ? `${displayBasePrice.toLocaleString("ko-KR")}원` : "금액은 결제 단계에서 확정됩니다"}
                            </p>
                        </div>
                    </div>
                </section>

                {/* 결제 수단 (UI) */}
                <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                    <h2 className="text-sm font-semibold">결제</h2>

                    <div className="mt-4 space-y-3 text-sm">
                        <label className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="payMethod"
                                checked={payMethod === "TOSS_ACCOUNT"}
                                onChange={() => setPayMethod("TOSS_ACCOUNT")}
                                className="h-4 w-4"
                            />
                            <span>Toss 쾌결좌이체</span>
                            <span className="ml-1 rounded-full bg-red-600 px-2 py-[2px] text-[10px]">혜택</span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="payMethod"
                                checked={payMethod === "TOSS_PAYMENTS"}
                                onChange={() => setPayMethod("TOSS_PAYMENTS")}
                                className="h-4 w-4"
                            />
                            <span>TOSS PAYMENTS</span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="payMethod"
                                checked={payMethod === "EXIMBAY"}
                                onChange={() => setPayMethod("EXIMBAY")}
                                className="h-4 w-4"
                            />
                            <span>Eximbay</span>
                        </label>

                        <p className="mt-2 text-[11px] text-zinc-400">
                            Toss 쾌결좌이체는 원화(KRW) 결제만 지원됩니다. 결제 시 할인은 자동 적용됩니다.
                        </p>
                    </div>
                </section>

                {/* T1 Point */}
                <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                    <h2 className="text-sm font-semibold">T1 Point</h2>

                    <div className="mt-3 flex gap-3">
                        <input
                            type="text"
                            value={usePoint.toLocaleString("ko-KR")}
                            onChange={handleChangeUsePoint}
                            className="flex-1 rounded-md border border-zinc-700 bg-black px-3 py-2 text-right text-sm outline-none"
                        />
                        <button type="button" className="w-20 rounded-md bg-zinc-800 text-xs">
                            최대 사용
                        </button>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">보유 0P</p>
                </section>

                {/* 결제 금액 요약 (표시용) */}
                <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-zinc-400">총 상품 금액</span>
                        <span>{displayBasePrice > 0 ? `${displayBasePrice.toLocaleString("ko-KR")}원` : "-"}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                        <span className="text-zinc-400">포인트 사용</span>
                        <span>-{usePoint.toLocaleString("ko-KR")}원</span>
                    </div>

                    <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-base font-bold">
                        <span>총 결제 금액</span>
                        <span>{displayBasePrice > 0 ? `${totalAmount.toLocaleString("ko-KR")}원` : "결제 단계에서 확정"}</span>
                    </div>

                    <p className="mt-4 text-[11px] text-zinc-500">
                        상품 구매 후 콘텐츠를 열람하였거나, 결제 후 7일이 지나면 구매 확정 처리됩니다. 구매 확정 이후 청약철회가 불가합니다.
                    </p>
                </section>

                {/* 약관 / 동의 */}
                <section className="mb-4 text-sm">
                    <h2 className="mb-2 text-sm font-semibold">약관</h2>
                    <ul className="space-y-1 text-xs text-zinc-300">
                        <li>(필수) 개인정보 수집 및 이용 안내</li>
                        <li>(필수) 결제서비스 이용약관</li>
                        <li>(필수) 멤버십 개인정보 이용동의</li>
                    </ul>

                    <label className="mt-4 flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={agreeAll} onChange={(e) => setAgreeAll(e.target.checked)} className="h-4 w-4" />
                        <span>주문 내용과 약관에 동의합니다.</span>
                    </label>

                    {errorMsg && <p className="mt-2 text-xs text-red-400">{errorMsg}</p>}
                </section>

                {/* 결제 버튼 */}
                <div className="mt-4">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:bg-zinc-700"
                    >
                        {submitting ? "결제 처리 중..." : "결제하기"}
                    </button>
                </div>
            </main>

            {/* 주문자 정보 변경 모달 */}
            {showOrdererModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-6 py-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">주문자 정보</h2>
                            <button type="button" onClick={() => setShowOrdererModal(false)} className="text-lg text-zinc-400">
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">성</label>
                                <input
                                    type="text"
                                    value={ordererLastName}
                                    onChange={(e) => setOrdererLastName(e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="성을 입력해 주세요"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">이름</label>
                                <input
                                    type="text"
                                    value={ordererFirstName}
                                    onChange={(e) => setOrdererFirstName(e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="이름을 입력해 주세요"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">이메일</label>
                                <input
                                    type="email"
                                    value={ordererEmail}
                                    onChange={(e) => setOrdererEmail(e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="이메일을 입력해 주세요"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowOrdererModal(false)}
                            className="mt-6 w-full rounded-xl border border-zinc-500 py-2 text-sm font-semibold text-zinc-100"
                        >
                            적용하기
                        </button>
                    </div>
                </div>
            )}

            {/* 멤버십 정보 입력 모달 */}
            {showMemberInfoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-6 py-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">멤버십 정보</h2>
                            <button type="button" onClick={() => setShowMemberInfoModal(false)} className="text-lg text-zinc-400">
                                ×
                            </button>
                        </div>

                        <p className="mb-3 text-[11px] text-sky-300">
                            구매 완료 후, 입력한 정보를 수정할 수 없어요. 정확히 확인하고 진행해 주세요.
                        </p>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">이름 (필수)</label>
                                <input
                                    type="text"
                                    value={memberName}
                                    onChange={(e) => setMemberName(e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="이름을 입력해 주세요"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">생년월일 (필수)</label>
                                <input
                                    type="text"
                                    value={memberBirth}
                                    onChange={(e) => setMemberBirth(e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="YYYY-MM-DD"
                                />
                                <p className="mt-1 text-[10px] text-zinc-500">입력 예시 2000-01-23</p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">전화번호 (필수)</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-24 rounded-md border border-zinc-700 bg-black px-2 py-2 text-xs"
                                        value={memberPhoneCountry}
                                        onChange={(e) => setMemberPhoneCountry(e.target.value)}
                                    >
                                        <option value="+82">+82 한국</option>
                                        <option value="+1">+1 미국</option>
                                        <option value="+81">+81 일본</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={memberPhone}
                                        onChange={(e) => setMemberPhone(onlyDigits(e.target.value))}
                                        className="flex-1 rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                        placeholder="하이픈 없이 입력해 주세요"
                                    />
                                </div>
                                <p className="mt-1 text-[10px] text-zinc-500">국가코드를 확인하고, 숫자만 정확히 입력해 주세요.</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={!memberName.trim() || !isValidBirth(memberBirth.trim()) || onlyDigits(memberPhone).length < 8}
                            onClick={() => {
                                setMemberInfoSaved(true);
                                setShowMemberInfoModal(false);
                            }}
                            className="mt-6 w-full rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:bg-zinc-700"
                        >
                            적용하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
