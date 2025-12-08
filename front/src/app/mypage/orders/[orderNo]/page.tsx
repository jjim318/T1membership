// src/app/mypage/orders/[orderNo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/apiClient";

type OrderStatus = string;

interface OrderItemRes {
    itemNo: number | null;
    itemNameSnapshot: string;
    itemOptionSnapshot?: string | null;
    itemImageSnapshot?: string | null;
    priceAtOrder: number;
    quantity: number;
    lineTotal: number;
}

// 🔥 백엔드 UserDetailOrderRes 와 맞춘 타입
interface UserDetailOrderRes {
    orderNo: number;
    orderStatus: OrderStatus;
    createdAt: string;
    updatedAt: string;
    orderTotalPrice: number;

    // 결제 관련
    paymentMethod?: string | null;
    paymentStatus?: string | null;

    // 배송 정보
    receiverName?: string | null;
    receiverPhone?: string | null;
    receiverAddress?: string | null;
    receiverDetailAddress?: string | null;
    receiverZipCode?: string | null;
    memo?: string | null;

    // 주문 상품들
    items: OrderItemRes[];

    // 🔥 멤버십 관련 필드 (백엔드 DTO에 추가한 것과 일치)
    membershipPlanCode?: string | null;          // 예: T1-2025-MONTHLY
    membershipPayType?: string | null;           // ONE_TIME / YEARLY / RECURRING
    membershipMonths?: number | null;
    membershipStartDate?: string | null;
    membershipEndDate?: string | null;
}

// ========= 헬퍼 =========

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}.${m}.${day}`;
}

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    const ss = `${d.getSeconds()}`.padStart(2, "0");
    return `${y}.${m}.${day} ${hh}:${mm}:${ss}`;
}

function formatMoney(value: number): string {
    return value.toLocaleString("ko-KR");
}

function getStatusLabel(status: OrderStatus): string {
    const upper = (status ?? "").toUpperCase();
    if (upper.includes("PENDING") || upper.includes("WAIT")) return "결제 대기";
    if (upper.includes("PAID") || upper.includes("CONFIRM")) return "구매확정";
    if (upper.includes("SHIP") || upper.includes("DELIVERY")) return "배송 중";
    if (upper.includes("DELIVERED") || upper.includes("DELIVERY_COMPLETE"))
        return "배송 완료";
    if (upper.includes("CANCEL")) return "취소 완료";
    if (upper.includes("REFUND")) return "환불 완료";
    return status;
}

// 🔥 멤버십 planCode → 화면에 보여줄 이름
function getMembershipDisplayName(planCode?: string | null): string {
    if (!planCode) return "멤버십 상품";

    switch (planCode) {
        case "T1-2025-MONTHLY":
            return "2025 T1 멤버십 (월간)";
        case "T1-2025-YEARLY":
            return "2025 T1 멤버십 (연간)";
        // 필요하면 코드 더 추가
        default:
            return "멤버십 상품";
    }
}

// ========= 페이지 컴포넌트 =========

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderNoParam = params?.orderNo;

    const [data, setData] = useState<UserDetailOrderRes | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderNoParam) return;

        const load = async () => {
            try {
                // 로그인 체크
                if (typeof window !== "undefined") {
                    const token = localStorage.getItem("accessToken");
                    if (!token) {
                        alert("로그인이 필요합니다.");
                        router.replace("/login");
                        return;
                    }
                }

                const res = await apiClient.get<UserDetailOrderRes>(
                    `/order/${orderNoParam}`,
                );
                setData(res.data);
            } catch (e) {
                console.error("[OrderDetail] load error", e);
                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    alert("다시 로그인 해주세요.");
                    router.replace("/login");
                } else if (axios.isAxiosError(e) && e.response?.status === 404) {
                    alert("해당 주문을 찾을 수 없습니다.");
                    router.replace("/mypage/orders");
                } else {
                    alert("주문 상세 정보를 불러오지 못했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [orderNoParam, router]);

    if (loading) {
        return (
            <main className="min-h-screen bg-black text-white pt-16 flex items-center justify-center">
                <span className="text-sm text-zinc-400">
                    주문 상세를 불러오는 중입니다…
                </span>
            </main>
        );
    }

    if (!data) {
        return (
            <main className="min-h-screen bg-black text-white pt-16 flex items-center justify-center">
                <span className="text-sm text-zinc-400">
                    주문 정보를 찾을 수 없습니다.
                </span>
            </main>
        );
    }

    const firstItem = data.items?.[0];
    // 🔥 멤버십 전용 주문 판별: orderItems 비어 있고, membershipPlanCode 가 있는 경우
    const isMembershipOrder =
        !!data.membershipPlanCode && (!data.items || data.items.length === 0);

    // 카드에 표시할 제목 / 수량 / 이미지
    const displayTitle = isMembershipOrder
        ? getMembershipDisplayName(data.membershipPlanCode)
        : firstItem?.itemNameSnapshot ?? "상품명 정보 없음";

    const displayQuantity = isMembershipOrder ? 1 : firstItem?.quantity ?? 0;

    const displayImage = isMembershipOrder
        ? "/icons/t1.png" // 멤버십 기본 이미지 (원하면 /images/membership.png 같은 걸로 교체)
        : firstItem?.itemImageSnapshot ?? "/icons/t1.png";

    return (
        <main className="min-h-screen bg-black text-white pt-16">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                {/* 상단: 날짜 + 주문 번호 */}
                <section className="mb-4">
                    <h1 className="text-xl md:text-2xl font-bold">
                        {formatDate(data.createdAt)} 주문
                    </h1>
                    <p className="mt-1 text-xs md:text-sm text-zinc-400">
                        주문 번호 {data.orderNo}
                    </p>
                </section>

                {/* 안내 바 */}
                <section className="space-y-2 mb-4 text-[11px] md:text-xs text-zinc-300">
                    {isMembershipOrder ? (
                        <>
                            <div className="rounded-md bg-zinc-800 px-3 py-2">
                                온라인 멤버십 이용권이에요. 배송 없이 계정에 바로
                                적용되는 상품입니다.
                            </div>
                            <div className="rounded-md bg-zinc-800 px-3 py-2">
                                멤버십 해지 및 환불 규정은 안내 페이지를 꼭 확인해 주세요.
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-md bg-zinc-800 px-3 py-2">
                                배송없이 행사현장에서 직접 받는 상품이에요.
                            </div>
                            <div className="rounded-md bg-zinc-800 px-3 py-2">
                                부분 취소 또는 일부 수량에 대한 교환/반품을 원하시면
                                &apos;1:1 문의하기&apos;를 통해 문의해 주세요.
                            </div>
                        </>
                    )}
                </section>

                {/* 주문 상품 / 멤버십 카드 */}
                <section className="bg-zinc-900 rounded-2xl p-4 md:p-5 mb-8">
                    {/* 상태 */}
                    <div className="text-[11px] md:text-xs text-zinc-400 mb-2">
                        {getStatusLabel(data.orderStatus)}
                    </div>

                    {/* 내용 */}
                    <div className="flex gap-3">
                        {/* 썸네일 */}
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={displayImage}
                                alt={displayTitle}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* 텍스트 */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="text-sm md:text-base font-semibold truncate">
                                {displayTitle}
                            </div>

                            {/* 옵션은 일반 상품일 때만 */}
                            {!isMembershipOrder &&
                                firstItem?.itemOptionSnapshot && (
                                    <div className="mt-0.5 text-[11px] md:text-xs text-zinc-400">
                                        {firstItem.itemOptionSnapshot}
                                    </div>
                                )}

                            <div className="mt-1 text-xs md:text-sm text-zinc-300">
                                {formatMoney(
                                    isMembershipOrder
                                        ? data.orderTotalPrice
                                        : firstItem?.priceAtOrder ?? 0,
                                )}
                                원 · {displayQuantity}개
                            </div>
                        </div>
                    </div>
                </section>

                {/* 멤버십 정보 블록 (멤버십 주문일 때만) */}
                {isMembershipOrder && (
                    <section className="mb-8">
                        <h2 className="text-sm md:text-base font-semibold mb-4">
                            멤버십 정보
                        </h2>
                        <dl className="space-y-2 text-xs md:text-sm">
                            <div className="flex justify-between">
                                <dt className="text-zinc-500">이용권</dt>
                                <dd className="text-zinc-100">
                                    {getMembershipDisplayName(
                                        data.membershipPlanCode,
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-zinc-500">결제 방식</dt>
                                <dd className="text-zinc-100">
                                    {data.membershipPayType ?? "-"}
                                </dd>
                            </div>
                            {data.membershipStartDate &&
                                data.membershipEndDate && (
                                    <div className="flex justify-between">
                                        <dt className="text-zinc-500">
                                            이용 기간
                                        </dt>
                                        <dd className="text-zinc-100">
                                            {formatDate(
                                                data.membershipStartDate,
                                            )}{" "}
                                            ~{" "}
                                            {formatDate(
                                                data.membershipEndDate,
                                            )}
                                        </dd>
                                    </div>
                                )}
                        </dl>
                    </section>
                )}

                {/* 구분선 */}
                <hr className="border-zinc-800 mb-6" />

                {/* 결제 정보 섹션 */}
                <section className="mb-8">
                    <h2 className="text-sm md:text-base font-semibold mb-4">
                        결제 정보
                    </h2>

                    <dl className="space-y-3 text-xs md:text-sm">
                        <div className="flex justify-between">
                            <dt className="text-zinc-500">결제 일시</dt>
                            <dd>{formatDateTime(data.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-zinc-500">상품 금액</dt>
                            <dd>{formatMoney(data.orderTotalPrice)}원</dd>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <dt className="text-zinc-100">총 결제 금액</dt>
                            <dd>{formatMoney(data.orderTotalPrice)}원</dd>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-400">
                            <dt className="pl-2">ㄴ 결제 수단</dt>
                            <dd>
                                {data.paymentMethod ?? "결제 수단 정보 없음"}
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* 적립 예정 포인트 (지금은 0P 고정) */}
                <section className="mb-8">
                    <h2 className="text-sm md:text-base font-semibold mb-3">
                        적립 예정 T1 Point
                    </h2>
                    <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-zinc-500">예정 포인트</span>
                        <span className="font-semibold">+ 0 P</span>
                    </div>
                </section>

                {/* 주문자 / 배송 정보 */}
                {/* 멤버십 주문이라도 주소가 들어가 있을 수 있으니, 일단 공통으로 노출 */}
                <section className="mb-10">
                    <h2 className="text-sm md:text-base font-semibold mb-3">
                        주문자
                    </h2>
                    <div className="space-y-2 text-xs md:text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">이름</span>
                            <span>{data.receiverName ?? "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">연락처</span>
                            <span>{data.receiverPhone ?? "-"}</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-xs md:text-sm font-semibold mb-2">
                            배송지 정보
                        </h3>
                        <div className="space-y-1 text-xs md:text-sm text-zinc-300">
                            {data.receiverZipCode ||
                            data.receiverAddress ||
                            data.receiverDetailAddress ? (
                                <>
                                    <div>
                                        {data.receiverZipCode
                                            ? `[${data.receiverZipCode}] `
                                            : ""}
                                        {data.receiverAddress ?? ""}{" "}
                                        {data.receiverDetailAddress ?? ""}
                                    </div>
                                    {data.memo && (
                                        <div className="text-zinc-400">
                                            요청사항: {data.memo}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-zinc-500">
                                    배송지 정보 없음
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 고객센터 버튼 */}
                <section className="mb-4">
                    <button
                        type="button"
                        className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm md:text-base hover:bg-zinc-800"
                        onClick={() =>
                            alert("고객센터 페이지는 추후 구현 예정입니다.")
                        }
                    >
                        고객센터
                    </button>
                </section>
            </div>
        </main>
    );
}
