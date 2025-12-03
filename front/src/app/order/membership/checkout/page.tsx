// src/app/order/membership/checkout/page.tsx
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

type Currency = "KRW" | "USD";
type PayMethod = "TOSS_ACCOUNT" | "TOSS_PAYMENTS" | "EXIMBAY";

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

// 🔥 백엔드 CreateMembershipOrderReq 에 맞춘 타입
// planCode: String, months: Integer, autoRenew: boolean, memberBirth/Name/Phone
interface CreateMembershipOrderReq {
    type: "MEMBERSHIP";   // JsonTypeInfo용
    planCode: string;     // String planCode
    months: number;       // Integer months
    autoRenew: boolean;
    memberBirth: string;
    memberName: string;
    memberPhone: string;
}

// 🔥 백엔드 CreateOrderRes(JSON)에 맞춰서 수정
//   {
//     "orderNo": 7,
//     "orderTotalPrice": 8900.00,
//     "checkoutUrl": "https://payment-gateway-sandbox..."
//   }
interface CreateOrderRes {
    orderNo: number;
    checkoutUrl?: string;    // 토스 결제창 URL
    paymentUrl?: string;     // 혹시 다른 타입에서 쓰면 겸사겸사 남겨둠
}

// JWT에서 이메일 뽑기
function extractEmailFromJwt(token: string | null): string | null {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payloadPart.padEnd(
            Math.ceil(payloadPart.length / 4) * 4,
            "=",
        );
        const json = atob(padded);
        const payload = JSON.parse(json);

        return payload.sub ?? payload.memberEmail ?? null;
    } catch (e) {
        console.error("[JWT] decode 실패 =", e);
        return null;
    }
}

// 안전한 months 파싱
function parseMonths(raw: string | null): number {
    if (!raw) return 1;
    const trimmed = raw.trim();
    if (trimmed === "") return 1;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
}

export default function MembershipCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 🔥 planCode는 이제 String 그대로 씀
    const planCode = searchParams.get("planCode") ?? ""; // 예: "T1-2025-MONTHLY"

    const months = parseMonths(searchParams.get("months"));
    const autoRenew = (searchParams.get("autoRenew") ?? "false") === "true";
    const itemName = searchParams.get("itemName") ?? "T1 Membership";
    const price = Number(searchParams.get("price") ?? "0");

    const [currency, setCurrency] = useState<Currency>("KRW");
    const [payMethod, setPayMethod] = useState<PayMethod>("TOSS_ACCOUNT");
    const [usePoint, setUsePoint] = useState(0);

    // 주문자 정보
    const [ordererLastName, setOrdererLastName] = useState("");
    const [ordererFirstName, setOrdererFirstName] = useState("");
    const [ordererEmail, setOrdererEmail] = useState("");
    const [showOrdererModal, setShowOrdererModal] = useState(false);

    // 멤버십 정보(모달)
    const [showMemberInfoModal, setShowMemberInfoModal] = useState(false);
    const [memberName, setMemberName] = useState("");
    const [memberBirth, setMemberBirth] = useState("");
    const [memberPhoneCountry, setMemberPhoneCountry] = useState("+82");
    const [memberPhone, setMemberPhone] = useState("");
    const [memberInfoSaved, setMemberInfoSaved] = useState(false);

    const [agreeAll, setAgreeAll] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const totalAmount = Math.max(price - usePoint, 0);

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
                console.log(
                    "[membership checkout] JWT에서 email 복구 =",
                    fromJwt,
                );
            }
        }

        if (!email) {
            console.warn(
                "[membership checkout] 이메일을 찾지 못했습니다. 주문자 정보는 빈 상태로 둡니다.",
            );
            return;
        }

        const load = async () => {
            try {
                const res = await apiClient.get<ApiResult<MemberInfo>>(
                    "/member/readOne",
                );

                if (!res.data.isSuccess) {
                    console.warn(
                        "[membership checkout] 회원 조회 실패 =",
                        res.data.resMessage,
                    );
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
                console.error(
                    "[membership checkout] 회원 정보 조회 중 오류",
                    e,
                );
            }
        };

        load();
    }, []);

    const handleChangeUsePoint = (e: ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value.replace(/\D/g, "") || "0");
        setUsePoint(v);
    };

    const handleSubmit = async () => {
        // 🔥 price 만 필수 체크 (planCode / months 는 서버에서 재검증)
        if (!price) {
            alert("주문 정보가 올바르지 않습니다. 다시 시도해 주세요.");
            return;
        }

        if (!memberInfoSaved) {
            alert("멤버십 정보를 먼저 입력해 주세요.");
            return;
        }

        if (!agreeAll) {
            alert("주문 내용과 약관에 모두 동의해 주세요.");
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);

            // 🔥 백 DTO(CreateMembershipOrderReq)에 맞게 body 구성
            const reqBody: CreateMembershipOrderReq = {
                type: "MEMBERSHIP",
                planCode, // String (예: "T1-2025-MONTHLY")
                months,
                autoRenew,
                memberName,
                memberBirth,
                memberPhone: `${memberPhoneCountry} ${memberPhone}`,
            };

            console.log("[membership] 요청 바디 =", reqBody);

            const res = await apiClient.post<ApiResult<CreateOrderRes>>(
                "/order/membership",
                reqBody,
            );

            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage || "주문 생성 실패");
            }

            const { orderNo, checkoutUrl, paymentUrl } = res.data.result;
            console.log("[membership] 주문 생성 성공 =", res.data.result);

            // 🔥 진짜 결제창 URL (토스에서 받은 URL) 로 이동
            const redirectUrl = checkoutUrl || paymentUrl;

            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                // 혹시 URL 못 받았을 때를 대비한 백업 동작
                console.warn(
                    "[membership] checkoutUrl 이 없어 /order/checkout 페이지로 이동합니다.",
                );
                router.push(`/order/checkout/${orderNo}`);
            }
        } catch (e: any) {
            console.error("[membership] 주문 생성 실패 =", e);

            if (e.response) {
                console.error(
                    "[membership] status =",
                    e.response.status,
                    "data =",
                    e.response.data,
                );
                alert(
                    e.response.data?.resMessage ??
                    `서버 오류 (${e.response.status})`,
                );
            } else {
                alert(
                    e.message ?? "주문 처리 중 오류가 발생했습니다.",
                );
            }

            setErrorMsg(
                e?.response?.data?.resMessage ||
                e?.message ||
                "주문 처리 중 오류가 발생했습니다.",
            );
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
                        <p className="text-zinc-400">
                            {ordererEmail || "이메일@example.com"}
                        </p>
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
                                    ? `${memberName} / ${memberBirth} / ${memberPhoneCountry} ${memberPhone}`
                                    : "정보 입력"}
                            </span>
                        </div>
                    </button>

                    <p className="mt-2 text-[11px] text-red-300">
                        필수 입력 항목이에요.
                    </p>
                </section>

                {/* 주문 상품 */}
                <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                    <h2 className="text-sm font-semibold">주문 상품</h2>

                    <div className="mt-4 flex items-center gap-4">
                        <div className="h-20 w-16 flex-shrink-0 rounded-lg bg-zinc-800" />
                        <div className="flex flex-1 flex-col gap-1 text-sm">
                            <p className="text-xs text-zinc-400">
                                {planCode || "T1 Membership"}
                            </p>
                            <p className="font-semibold">{itemName}</p>
                            <p className="text-xs text-zinc-400">
                                {months}개월 이용
                            </p>
                            <p className="mt-1 text-base font-bold">
                                {price.toLocaleString("ko-KR")}원
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
                                onChange={() =>
                                    setPayMethod("TOSS_ACCOUNT")
                                }
                                className="h-4 w-4"
                            />
                            <span>Toss 쾌결좌이체</span>
                            <span className="ml-1 rounded-full bg-red-600 px-2 py-[2px] text-[10px]">
                                혜택
                            </span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="payMethod"
                                checked={payMethod === "TOSS_PAYMENTS"}
                                onChange={() =>
                                    setPayMethod("TOSS_PAYMENTS")
                                }
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
                            Toss 쾌결좌이체는 원화(KRW) 결제만 지원됩니다. 결제 시
                            할인은 자동 적용됩니다.
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
                        <button
                            type="button"
                            className="w-20 rounded-md bg-zinc-800 text-xs"
                        >
                            최대 사용
                        </button>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">보유 0P</p>
                </section>

                {/* 결제 금액 요약 */}
                <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-zinc-400">총 상품 금액</span>
                        <span>{price.toLocaleString("ko-KR")}원</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                        <span className="text-zinc-400">포인트 사용</span>
                        <span>-{usePoint.toLocaleString("ko-KR")}원</span>
                    </div>

                    <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-base font-bold">
                        <span>총 결제 금액</span>
                        <span>{totalAmount.toLocaleString("ko-KR")}원</span>
                    </div>

                    <p className="mt-4 text-[11px] text-zinc-500">
                        상품 구매 후 콘텐츠를 열람하였거나, 결제 후 7일이 지나면
                        구매 확정 처리됩니다. 구매 확정 이후 청약철회가
                        불가합니다.
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
                        <input
                            type="checkbox"
                            checked={agreeAll}
                            onChange={(e) => setAgreeAll(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <span>주문 내용과 약관에 동의합니다.</span>
                    </label>

                    {errorMsg && (
                        <p className="mt-2 text-xs text-red-400">
                            {errorMsg}
                        </p>
                    )}
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
                            <h2 className="text-sm font-semibold">
                                주문자 정보
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowOrdererModal(false)}
                                className="text-lg text-zinc-400"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">
                                    성
                                </label>
                                <input
                                    type="text"
                                    value={ordererLastName}
                                    onChange={(e) =>
                                        setOrdererLastName(e.target.value)
                                    }
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="성을 입력해 주세요"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">
                                    이름
                                </label>
                                <input
                                    type="text"
                                    value={ordererFirstName}
                                    onChange={(e) =>
                                        setOrdererFirstName(e.target.value)
                                    }
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="이름을 입력해 주세요"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    value={ordererEmail}
                                    onChange={(e) =>
                                        setOrdererEmail(e.target.value)
                                    }
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
                            <h2 className="text-sm font-semibold">
                                멤버십 정보
                            </h2>
                            <button
                                type="button"
                                onClick={() =>
                                    setShowMemberInfoModal(false)
                                }
                                className="text-lg text-zinc-400"
                            >
                                ×
                            </button>
                        </div>

                        <p className="mb-3 text-[11px] text-sky-300">
                            구매 완료 후, 입력한 정보를 수정할 수 없어요. 정확히
                            확인하고 진행해 주세요.
                        </p>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">
                                    이름 (필수)
                                </label>
                                <input
                                    type="text"
                                    value={memberName}
                                    onChange={(e) =>
                                        setMemberName(e.target.value)
                                    }
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="이름을 입력해 주세요"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">
                                    생년월일 (필수)
                                </label>
                                <input
                                    type="text"
                                    value={memberBirth}
                                    onChange={(e) =>
                                        setMemberBirth(e.target.value)
                                    }
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                    placeholder="YYYY-MM-DD"
                                />
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    입력 예시 2000-01-23
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-zinc-300">
                                    전화번호 (필수)
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-24 rounded-md border border-zinc-700 bg-black px-2 py-2 text-xs"
                                        value={memberPhoneCountry}
                                        onChange={(e) =>
                                            setMemberPhoneCountry(
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="+82">+82 한국</option>
                                        <option value="+1">+1 미국</option>
                                        <option value="+81">+81 일본</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={memberPhone}
                                        onChange={(e) =>
                                            setMemberPhone(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        className="flex-1 rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm outline-none"
                                        placeholder="하이픈 없이 입력해 주세요"
                                    />
                                </div>
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    국가코드를 확인하고, 숫자만 정확히 입력해
                                    주세요.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={
                                !memberName || !memberBirth || !memberPhone
                            }
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
