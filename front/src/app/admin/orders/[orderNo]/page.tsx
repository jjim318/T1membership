// src/app/admin/orders/[orderNo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/apiClient";

type OrderStatus = string;

// 라인 DTO
interface AdminOrderItemRes {
    orderItemNo: number;
    itemNo: number | null;
    itemNameSnapshot: string;
    itemOptionSnapshot?: string | null;
    itemImageSnapshot?: string | null;
    priceAtOrder: number | null;
    quantity: number;
    lineTotal: number | null;
    itemCategorySnapshot?: string | null;
}

// 주문 상세 DTO
interface AdminDetailOrderRes {
    orderNo: number;
    orderStatus: OrderStatus;
    createdAt: string;
    updatedAt: string;
    orderTotalPrice: number | null;

    paymentMethod?: string | null;
    paymentStatus?: string | null;

    receiverName?: string | null;
    receiverPhone?: string | null;
    receiverAddress?: string | null;
    receiverDetailAddress?: string | null;
    receiverZipCode?: string | null;
    memo?: string | null;

    memberEmail: string;
    memberNickName?: string | null;

    items: AdminOrderItemRes[];
}

// 취소 요청/응답
interface CancelOrderReq {
    orderNo: number;
    reason: string;
    orderItemNos?: number[] | null;
}

interface CancelOrderRes {
    orderNo: number;
    orderStatus: string;
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

// ✅ null 방어
function formatMoney(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "0";
    return value.toLocaleString("ko-KR");
}

// 상태 라벨
function getStatusLabel(status: OrderStatus): string {
    const upper = (status ?? "").toUpperCase();

    if (
        upper === "PARTIALLY_CANCELED" ||
        upper === "PARTIAL_CANCEL" ||
        (upper.includes("PART") && upper.includes("CANCEL"))
    ) {
        return "부분 취소";
    }

    if (upper === "ORDERED") return "결제 대기";
    if (upper === "PAID") return "결제 완료";

    if (upper.includes("PENDING") || upper.includes("WAIT")) return "결제 대기";
    if (upper.includes("PREPARE")) return "상품 준비중";
    if (upper.includes("CONFIRM") || upper.includes("COMPLETE")) return "구매확정";
    if (upper.includes("SHIP")) return "배송 중";
    if (upper.includes("DELIVERED")) return "배송 완료";
    if (upper.includes("CANCEL")) return "취소 완료";
    if (upper.includes("REFUND")) return "환불 완료";

    return status;
}

// 부분 취소 상태인지
function isPartiallyCanceled(status: OrderStatus): boolean {
    const upper = (status ?? "").toUpperCase();
    return (
        upper === "PARTIALLY_CANCELED" ||
        upper === "PARTIAL_CANCEL" ||
        (upper.includes("PART") && upper.includes("CANCEL"))
    );
}

// 관리자 취소 가능 상태
function isAdminCancelableStatus(status: OrderStatus): boolean {
    const upper = (status ?? "").toUpperCase();
    return upper === "ORDERED" || upper === "PAID";
}

// MD 상품인지
function isMdItem(item: AdminOrderItemRes): boolean {
    const cat = (item.itemCategorySnapshot ?? "").toUpperCase();
    return cat === "MD";
}

export default function AdminOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderNoParam = params?.orderNo;

    const [data, setData] = useState<AdminDetailOrderRes | null>(null);
    const [loading, setLoading] = useState(true);

    const [cancelAllLoading, setCancelAllLoading] = useState(false);
    const [cancelItemLoading, setCancelItemLoading] = useState<number | null>(null);

    useEffect(() => {
        const orderNo =
            typeof orderNoParam === "string"
                ? orderNoParam
                : Array.isArray(orderNoParam)
                    ? orderNoParam[0]
                    : undefined;

        if (!orderNo) return;

        const load = async () => {
            try {
                const res = await apiClient.get<AdminDetailOrderRes>(
                    `/admin/order/${orderNo}`,
                );
                setData(res.data);
            } catch (e) {
                console.error("[AdminOrderDetail] load error", e);
                if (axios.isAxiosError(e) && e.response?.status === 404) {
                    alert("해당 주문을 찾을 수 없습니다.");
                } else {
                    alert("관리자용 주문 상세 정보를 불러오지 못했습니다.");
                }
                router.replace("/admin/orders");
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [orderNoParam, router]);

    // ===== 레이아웃에서 이미 bg / pt-16 을 줬으니 여기선 안 준다 =====

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <span className="text-sm text-zinc-400">
                    주문 상세를 불러오는 중입니다…
                </span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <span className="text-sm text-zinc-400">
                    주문 정보를 찾을 수 없습니다.
                </span>
            </div>
        );
    }

    const items = data.items ?? [];
    const partiallyCanceled = isPartiallyCanceled(data.orderStatus);

    const canCancelAll =
        !partiallyCanceled &&
        items.length > 0 &&
        isAdminCancelableStatus(data.orderStatus) &&
        items.every((it) => isMdItem(it));

    const canCancelItem = (item: AdminOrderItemRes): boolean => {
        if (!isAdminCancelableStatus(data.orderStatus)) return false;
        return isMdItem(item);
    };

    // =========================
    //   전체 취소 (관리자)
    // =========================
    const handleCancelAll = async () => {
        if (!data) return;
        if (!canCancelAll) {
            alert("전체 취소 가능 상태가 아닙니다.");
            return;
        }

        const ok = window.confirm(
            "이 주문을 전체 취소하시겠습니까?\n(멤버십/POP 상품은 현재 로직에서 제외됩니다.)",
        );
        if (!ok) return;

        const reason = window.prompt("취소 사유를 입력해 주세요.");
        if (!reason || reason.trim().length === 0) {
            alert("취소 사유를 입력해야 합니다.");
            return;
        }

        setCancelAllLoading(true);
        try {
            const body: CancelOrderReq = {
                orderNo: data.orderNo,
                reason: reason.trim(),
                orderItemNos: null,
            };

            await apiClient.patch<CancelOrderRes>("/admin/order/cancel/all", body);

            alert("관리자 전체 취소가 완료되었습니다.");

            const refreshed = await apiClient.get<AdminDetailOrderRes>(
                `/admin/order/${data.orderNo}`,
            );
            setData(refreshed.data);
        } catch (e) {
            console.error("[AdminOrderDetail] cancel all error", e);
            if (axios.isAxiosError(e)) {
                const msg =
                    (e.response?.data as any)?.resMessage ||
                    (e.response?.data as any)?.message ||
                    "주문 전체 취소에 실패했습니다.";
                alert(msg);
            } else {
                alert("주문 전체 취소에 실패했습니다.");
            }
        } finally {
            setCancelAllLoading(false);
        }
    };

    // =========================
    //   부분 취소 (관리자)
    // =========================
    const handleCancelItem = async (item: AdminOrderItemRes) => {
        if (!data) return;
        if (!canCancelItem(item)) {
            alert("해당 상품은 관리자 취소가 불가능한 상태입니다.");
            return;
        }

        const ok = window.confirm(
            `해당 상품을 부분 취소하시겠습니까?\n\n상품명: ${item.itemNameSnapshot}\n수량: ${item.quantity}개`,
        );
        if (!ok) return;

        const reason = window.prompt("해당 상품의 취소 사유를 입력해 주세요.");
        if (!reason || reason.trim().length === 0) {
            alert("취소 사유를 입력해야 합니다.");
            return;
        }

        setCancelItemLoading(item.orderItemNo);
        try {
            const body: CancelOrderReq = {
                orderNo: data.orderNo,
                reason: reason.trim(),
                orderItemNos: [item.orderItemNo],
            };

            await apiClient.patch<CancelOrderRes>(
                `/admin/order/${data.orderNo}/cancel-items`,
                body,
            );

            alert("관리자 부분 취소가 완료되었습니다.");

            const refreshed = await apiClient.get<AdminDetailOrderRes>(
                `/admin/order/${data.orderNo}`,
            );
            setData(refreshed.data);
        } catch (e) {
            console.error("[AdminOrderDetail] cancel item error", e);
            if (axios.isAxiosError(e)) {
                const msg =
                    (e.response?.data as any)?.resMessage ||
                    (e.response?.data as any)?.message ||
                    "상품 부분 취소에 실패했습니다.";
                alert(msg);
            } else {
                alert("상품 부분 취소에 실패했습니다.");
            }
        } finally {
            setCancelItemLoading(null);
        }
    };

    // =========================
    //   렌더링
    // =========================

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
            {/* 상단 영역 */}
            <section className="mb-6 flex flex-col gap-2">

                <h1 className="text-xl md:text-2xl font-bold">
                    주문 #{data.orderNo}
                </h1>
                <p className="text-xs md:text-sm text-zinc-400">
                    주문 일시 {formatDateTime(data.createdAt)}
                </p>
                <p className="text-xs md:text-sm text-zinc-300">
                    상태: {getStatusLabel(data.orderStatus)}
                </p>
                <p className="text-xs md:text-sm text-zinc-300">
                    회원: {data.memberEmail}
                    {data.memberNickName && ` (${data.memberNickName})`}
                </p>
            </section>

            {/* 안내 바 */}
            <section className="space-y-2 mb-6 text-[11px] md:text-xs text-zinc-300">
                {partiallyCanceled && (
                    <div className="rounded-md bg-zinc-800 px-3 py-2">
                        일부 상품이 취소된 주문입니다.
                    </div>
                )}
                <div className="rounded-md bg-zinc-800 px-3 py-2">
                    관리자 화면입니다. 결제 상태와 실제 Toss 환불 상태가 다를 수 있으니,
                    부분 취소/전체 취소 후 정산 내역도 함께 확인해 주세요.
                </div>
            </section>

            {/* 주문 상품 리스트 */}
            <section className="mb-8">
                <h2 className="text-sm md:text-base font-semibold mb-3">
                    주문 상품
                </h2>
                {items.length === 0 ? (
                    <p className="text-xs text-zinc-400">주문 상품이 없습니다.</p>
                ) : (
                    <ul className="space-y-3">
                        {items.map((item, idx) => {
                            const md = isMdItem(item);
                            const itemCancelable = canCancelItem(item);

                            return (
                                <li
                                    key={`${item.itemNo ?? "item"}-${idx}`}
                                    className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-xs md:text-sm"
                                >
                                    {/* 썸네일 */}
                                    <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.itemImageSnapshot || "/icons/t1.png"}
                                            alt={item.itemNameSnapshot}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* 정보 */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="font-semibold truncate">
                                            {item.itemNameSnapshot}
                                        </div>
                                        {item.itemOptionSnapshot && (
                                            <div className="mt-0.5 text-[11px] md:text-xs text-zinc-400">
                                                {item.itemOptionSnapshot}
                                            </div>
                                        )}

                                        <div className="mt-1 text-[11px] md:text-xs text-zinc-400">
                                            개당 {formatMoney(item.priceAtOrder)}원 · 수량{" "}
                                            {item.quantity}개
                                        </div>

                                        <div className="mt-1 text-[11px] md:text-xs text-zinc-400">
                                            라인 금액 {formatMoney(item.lineTotal)}원
                                        </div>

                                        {md && (
                                            <div className="mt-1 text-[11px] md:text-xs text-emerald-400">
                                                MD 상품
                                            </div>
                                        )}
                                    </div>

                                    {/* 금액 + 취소 버튼 */}
                                    <div className="text-right flex flex-col justify-between items-end gap-2">
                                        {itemCancelable ? (
                                            <button
                                                type="button"
                                                className="px-2 py-1 rounded-lg border border-zinc-700 text-[11px] md:text-xs hover:bg-zinc-800 disabled:opacity-60"
                                                disabled={
                                                    cancelItemLoading === item.orderItemNo
                                                }
                                                onClick={() => handleCancelItem(item)}
                                            >
                                                {cancelItemLoading === item.orderItemNo
                                                    ? "취소 처리 중…"
                                                    : "이 상품 부분 취소"}
                                            </button>
                                        ) : (
                                            <span className="text-[11px] md:text-xs text-zinc-500">
                                                취소 불가
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* 결제 정보 */}
            <section className="mb-8">
                <h2 className="text-sm md:text-base font-semibold mb-3">
                    결제 정보
                </h2>
                <dl className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between">
                        <dt className="text-zinc-500">총 결제 금액</dt>
                        <dd>{formatMoney(data.orderTotalPrice)}원</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-zinc-500">결제 수단</dt>
                        <dd>{data.paymentMethod ?? "-"}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-zinc-500">결제 상태</dt>
                        <dd>{data.paymentStatus ?? "-"}</dd>
                    </div>
                </dl>
            </section>

            {/* 배송 정보 */}
            <section className="mb-10">
                <h2 className="text-sm md:text-base font-semibold mb-3">
                    배송지 정보
                </h2>
                <div className="space-y-1 text-xs md:text-sm text-zinc-300">
                    {data.receiverZipCode ||
                    data.receiverAddress ||
                    data.receiverDetailAddress ? (
                        <>
                            <div>
                                {data.receiverZipCode
                                    ? `[${data.receiverZipCode}] `
                                    : ""}{" "}
                                {data.receiverAddress ?? ""}{" "}
                                {data.receiverDetailAddress ?? ""}
                            </div>
                            {data.receiverName && (
                                <div>수령인: {data.receiverName}</div>
                            )}
                            {data.receiverPhone && (
                                <div>연락처: {data.receiverPhone}</div>
                            )}
                            {data.memo && (
                                <div className="text-zinc-400">
                                    요청사항: {data.memo}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-zinc-500">배송지 정보 없음</div>
                    )}
                </div>
            </section>

            {/* 하단 버튼 */}
            <section className="mb-2 space-y-2">
                {canCancelAll && (
                    <button
                        type="button"
                        className="w-full py-3 rounded-xl bg-red-600 text-sm md:text-base font-semibold hover:bg-red-500 disabled:opacity-60"
                        disabled={cancelAllLoading}
                        onClick={handleCancelAll}
                    >
                        {cancelAllLoading ? "전체 취소 처리 중…" : "주문 전체 취소 (관리자)"}
                    </button>
                )}

                <button
                    type="button"
                    className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm md:text-base hover:bg-zinc-800"
                    onClick={() => router.push("/admin/orders")}
                >
                    주문 목록으로 돌아가기
                </button>
            </section>
        </div>
    );
}
