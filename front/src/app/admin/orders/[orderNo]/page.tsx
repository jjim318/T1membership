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

// ✅ (관리자) 배송지 변경 요청 DTO
interface AdminUpdateOrderAddressReq {
    orderNo: number;
    receiverName: string;
    receiverPhone: string;
    receiverZipCode: string;
    receiverAddress: string;
    receiverDetailAddress: string;
    memo?: string | null;
}

// ✅ (관리자) 상태 변경 요청 DTO
interface AdminUpdateOrderStatusReq {
    orderNo: number;
    orderStatus: string;
}

// =====================
// 실무형 룰 헬퍼
// =====================

// ✅ 관리자 상태 변경: “배송 단계”만 변경 허용
const ADMIN_STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "SHIPMENT_READY", label: "배송준비" },
    { value: "SHIPPED", label: "배송중" },
    { value: "DELIVERED", label: "배송완료" },
];

// ✅ “상태 변경 버튼”을 켤 수 있는 현재 상태(출고/배송 프로세스 시작 전)
function canAdminChangeStatus(current: string): boolean {
    const s = (current ?? "").toUpperCase();
    // 보통 결제완료/상품준비중/배송준비 단계에서만 관리자 수동 변경을 허용
    return s === "PAID" || s === "PROCESSING" || s === "SHIPMENT_READY";
}

// ✅ 배송이 시작되었는지(배송지 변경 금지 기준)
function isShippingStarted(current: string): boolean {
    const s = (current ?? "").toUpperCase();
    return s === "SHIPPED" || s === "DELIVERED" || s === "RETURNED";
}

// ✅ 사실상 확정/종료 상태(여기선 변경 작업들 막는게 안전)
function isFinalized(current: string): boolean {
    const s = (current ?? "").toUpperCase();
    return (
        s === "DELIVERED" ||
        s === "CANCELED" ||
        s === "PARTIALLY_CANCELED" ||
        s === "REFUNDED" ||
        s === "RETURNED" ||
        s === "PAYMENT_FAILED" ||
        s === "PAYMENT_EXPIRED"
    );
}

// ========= 표시/포맷 헬퍼 =========
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

function formatMoney(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "0";
    return value.toLocaleString("ko-KR");
}

// 상태 라벨 (백엔드 enum 기준)
function getStatusLabel(status: string): string {
    switch ((status ?? "").toUpperCase()) {
        case "PAYMENT_PENDING":
            return "결제대기";
        case "PAID":
            return "결제완료";
        case "PROCESSING":
            return "상품준비중";
        case "SHIPMENT_READY":
            return "배송준비";
        case "SHIPPED":
            return "배송중";
        case "DELIVERED":
            return "배송완료";
        case "PAYMENT_FAILED":
            return "결제실패";
        case "PAYMENT_EXPIRED":
            return "결제만료";
        case "REFUNDED":
            return "환불완료";
        case "CANCELED":
            return "취소";
        case "PARTIALLY_CANCELED":
            return "부분취소";
        case "RETURNED":
            return "반품";
        default:
            return status;
    }
}

// 부분 취소 상태인지
function isPartiallyCanceled(status: OrderStatus): boolean {
    const upper = (status ?? "").toUpperCase();
    return (
        upper === "PARTIALLY_CANCELED" ||
        upper === "PARTIALLY_CANCELLED" ||
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

    // ===== 데이터 =====
    const [data, setData] = useState<AdminDetailOrderRes | null>(null);
    const [loading, setLoading] = useState(true);

    // ===== 취소 =====
    const [cancelAllLoading, setCancelAllLoading] = useState(false);
    const [cancelItemLoading, setCancelItemLoading] = useState<number | null>(null);

    // ✅ 상태 변경 UI
    const [statusEditing, setStatusEditing] = useState(false);
    const [newStatus, setNewStatus] = useState<string>("");

    // ✅ 배송지 변경 UI
    const [addressEditing, setAddressEditing] = useState(false);
    const [addressSaving, setAddressSaving] = useState(false);
    const [addrForm, setAddrForm] = useState({
        receiverName: "",
        receiverPhone: "",
        receiverZipCode: "",
        receiverAddress: "",
        receiverDetailAddress: "",
        memo: "",
    });

    // ✅ orderNo 문자열 추출
    const orderNo = (() => {
        return typeof orderNoParam === "string"
            ? orderNoParam
            : Array.isArray(orderNoParam)
                ? orderNoParam[0]
                : undefined;
    })();

    // ========= 공통: 상세 재조회 =========
    const refresh = async (no: string | number) => {
        const res = await apiClient.get<AdminDetailOrderRes>(`/admin/order/${no}`);
        const next = res.data;
        setData(next);

        // 상태/배송지 폼도 최신화
        setNewStatus(next.orderStatus ?? "");
        setAddrForm({
            receiverName: next.receiverName ?? "",
            receiverPhone: next.receiverPhone ?? "",
            receiverZipCode: next.receiverZipCode ?? "",
            receiverAddress: next.receiverAddress ?? "",
            receiverDetailAddress: next.receiverDetailAddress ?? "",
            memo: next.memo ?? "",
        });
    };

    useEffect(() => {
        if (!orderNo) return;

        const load = async () => {
            try {
                await refresh(orderNo);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderNo, router]);

    // ✅ Hook 오류 방지: 단순 계산은 훅 없이
    const addressSummary = (() => {
        if (!data) return "";
        const z = data.receiverZipCode ? `[${data.receiverZipCode}] ` : "";
        const a = data.receiverAddress ?? "";
        const d = data.receiverDetailAddress ?? "";
        return `${z}${a} ${d}`.trim();
    })();

    // ===== 조기 return =====
    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <span className="text-sm text-zinc-400">주문 상세를 불러오는 중입니다…</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <span className="text-sm text-zinc-400">주문 정보를 찾을 수 없습니다.</span>
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

    // ✅ 실무형 룰 적용 (버튼 활성화 조건)
    const allowStatusChange =
        canAdminChangeStatus(data.orderStatus) && !isFinalized(data.orderStatus);

    const allowAddressChange =
        !isShippingStarted(data.orderStatus) && !isFinalized(data.orderStatus);

    // =========================
    //   전체 취소 (관리자)
    // =========================
    const handleCancelAll = async () => {
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
            await refresh(data.orderNo);
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

            await apiClient.patch<CancelOrderRes>(`/admin/order/${data.orderNo}/cancel-items`, body);

            alert("관리자 부분 취소가 완료되었습니다.");
            await refresh(data.orderNo);
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
    //   상태 변경 (관리자)
    // =========================
    const handleUpdateStatus = async () => {
        if (!allowStatusChange) {
            alert("현재 상태에서는 관리자가 상태 변경을 할 수 없습니다.");
            return;
        }

        const next = (newStatus || "").trim();
        if (!next) {
            alert("변경할 상태를 선택해 주세요.");
            return;
        }

        if ((data.orderStatus || "").toUpperCase() === next.toUpperCase()) {
            alert("현재 상태와 동일합니다.");
            return;
        }

        const ok = window.confirm(
            `주문 상태를 [${getStatusLabel(data.orderStatus)}] → [${getStatusLabel(
                next,
            )}] 로 변경하시겠습니까?`,
        );
        if (!ok) return;

        try {
            const body: AdminUpdateOrderStatusReq = {
                orderNo: data.orderNo,
                orderStatus: next,
            };

            await apiClient.patch("/admin/order/status", body);

            alert("주문 상태가 변경되었습니다.");
            setStatusEditing(false);
            await refresh(data.orderNo);
        } catch (e) {
            console.error("[AdminOrderDetail] update status error", e);
            if (axios.isAxiosError(e)) {
                const msg =
                    (e.response?.data as any)?.resMessage ||
                    (e.response?.data as any)?.message ||
                    "주문 상태 변경에 실패했습니다.";
                alert(msg);
            } else {
                alert("주문 상태 변경에 실패했습니다.");
            }
        }
    };

    // =========================
    //   배송지 변경 (관리자)
    // =========================
    const handleSaveAddress = async () => {
        if (!allowAddressChange) {
            alert("배송이 시작된 주문은 배송지 변경이 불가합니다.");
            return;
        }

        // 간단 검증
        if (!addrForm.receiverName.trim()) return alert("수령인 이름을 입력해 주세요.");
        if (!addrForm.receiverPhone.trim()) return alert("연락처를 입력해 주세요.");
        if (!addrForm.receiverZipCode.trim()) return alert("우편번호를 입력해 주세요.");
        if (!addrForm.receiverAddress.trim()) return alert("주소를 입력해 주세요.");
        if (!addrForm.receiverDetailAddress.trim()) return alert("상세주소를 입력해 주세요.");

        const ok = window.confirm("배송지 정보를 저장하시겠습니까?");
        if (!ok) return;

        setAddressSaving(true);
        try {
            const body: AdminUpdateOrderAddressReq = {
                orderNo: data.orderNo,
                receiverName: addrForm.receiverName.trim(),
                receiverPhone: addrForm.receiverPhone.trim(),
                receiverZipCode: addrForm.receiverZipCode.trim(),
                receiverAddress: addrForm.receiverAddress.trim(),
                receiverDetailAddress: addrForm.receiverDetailAddress.trim(),
                memo: addrForm.memo?.trim() ?? "",
            };

            await apiClient.patch("/admin/order/address", body);

            alert("배송지 정보가 변경되었습니다.");
            setAddressEditing(false);
            await refresh(data.orderNo);
        } catch (e) {
            console.error("[AdminOrderDetail] update address error", e);
            if (axios.isAxiosError(e)) {
                const msg =
                    (e.response?.data as any)?.resMessage ||
                    (e.response?.data as any)?.message ||
                    "배송지 변경에 실패했습니다.";
                alert(msg);
            } else {
                alert("배송지 변경에 실패했습니다.");
            }
        } finally {
            setAddressSaving(false);
        }
    };

    // =========================
    //   렌더링
    // =========================
    return (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
            {/* 상단 영역 */}
            <section className="mb-6 flex flex-col gap-2">
                <h1 className="text-xl md:text-2xl font-bold">주문 #{data.orderNo}</h1>
                <p className="text-xs md:text-sm text-zinc-400">
                    주문 일시 {formatDateTime(data.createdAt)}
                </p>

                {/* ✅ 상태 + 상태 변경 UI */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs md:text-sm text-zinc-300">
                        상태: <span className="font-semibold">{getStatusLabel(data.orderStatus)}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        {!statusEditing ? (
                            <button
                                type="button"
                                disabled={!allowStatusChange}
                                className={`px-3 py-2 rounded-xl text-xs border ${
                                    allowStatusChange
                                        ? "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                                        : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                                }`}
                                onClick={() => {
                                    if (!allowStatusChange) return;
                                    // 기본 선택값을 “첫 번째 옵션”으로 잡아주는 게 UX가 좋음
                                    setNewStatus(ADMIN_STATUS_OPTIONS[0]?.value ?? "");
                                    setStatusEditing(true);
                                }}
                            >
                                상태 변경
                            </button>
                        ) : (
                            <>
                                <select
                                    className="bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    {ADMIN_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-xl bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
                                    onClick={handleUpdateStatus}
                                >
                                    변경 저장
                                </button>

                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs hover:bg-zinc-800"
                                    onClick={() => {
                                        setStatusEditing(false);
                                        setNewStatus(data.orderStatus ?? "");
                                    }}
                                >
                                    취소
                                </button>
                            </>
                        )}
                    </div>

                    {!allowStatusChange && (
                        <p className="text-[11px] text-zinc-500">
                            현재 상태({getStatusLabel(data.orderStatus)})에서는 관리자 상태 변경이 제한됩니다.
                        </p>
                    )}
                </div>

                <p className="text-xs md:text-sm text-zinc-300">
                    회원: {data.memberEmail}
                    {data.memberNickName && ` (${data.memberNickName})`}
                </p>
            </section>

            {/* 안내 바 */}
            <section className="space-y-2 mb-6 text-[11px] md:text-xs text-zinc-300">
                {partiallyCanceled && (
                    <div className="rounded-md bg-zinc-800 px-3 py-2">일부 상품이 취소된 주문입니다.</div>
                )}
                <div className="rounded-md bg-zinc-800 px-3 py-2">
                    관리자 화면입니다. 결제 상태와 실제 Toss 환불 상태가 다를 수 있으니, 부분 취소/전체 취소 후 정산 내역도 함께 확인해 주세요.
                </div>
            </section>

            {/* 주문 상품 리스트 */}
            <section className="mb-8">
                <h2 className="text-sm md:text-base font-semibold mb-3">주문 상품</h2>

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
                                        <div className="font-semibold truncate">{item.itemNameSnapshot}</div>

                                        {item.itemOptionSnapshot && (
                                            <div className="mt-0.5 text-[11px] md:text-xs text-zinc-400">
                                                {item.itemOptionSnapshot}
                                            </div>
                                        )}

                                        <div className="mt-1 text-[11px] md:text-xs text-zinc-400">
                                            개당 {formatMoney(item.priceAtOrder)}원 · 수량 {item.quantity}개
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

                                    {/* 취소 버튼 */}
                                    <div className="text-right flex flex-col justify-between items-end gap-2">
                                        {itemCancelable ? (
                                            <button
                                                type="button"
                                                className="px-2 py-1 rounded-lg border border-zinc-700 text-[11px] md:text-xs hover:bg-zinc-800 disabled:opacity-60"
                                                disabled={cancelItemLoading === item.orderItemNo}
                                                onClick={() => handleCancelItem(item)}
                                            >
                                                {cancelItemLoading === item.orderItemNo ? "취소 처리 중…" : "이 상품 부분 취소"}
                                            </button>
                                        ) : (
                                            <span className="text-[11px] md:text-xs text-zinc-500">취소 불가</span>
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
                <h2 className="text-sm md:text-base font-semibold mb-3">결제 정보</h2>
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
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm md:text-base font-semibold">배송지 정보</h2>

                    {!addressEditing ? (
                        <button
                            type="button"
                            disabled={!allowAddressChange}
                            className={`px-3 py-2 rounded-xl text-xs border ${
                                allowAddressChange
                                    ? "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                                    : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                            }`}
                            onClick={() => {
                                if (!allowAddressChange) return;
                                setAddrForm({
                                    receiverName: data.receiverName ?? "",
                                    receiverPhone: data.receiverPhone ?? "",
                                    receiverZipCode: data.receiverZipCode ?? "",
                                    receiverAddress: data.receiverAddress ?? "",
                                    receiverDetailAddress: data.receiverDetailAddress ?? "",
                                    memo: data.memo ?? "",
                                });
                                setAddressEditing(true);
                            }}
                        >
                            배송지 변경
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="px-3 py-2 rounded-xl bg-emerald-600 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
                                disabled={addressSaving}
                                onClick={handleSaveAddress}
                            >
                                {addressSaving ? "저장 중…" : "변경 저장"}
                            </button>
                            <button
                                type="button"
                                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs hover:bg-zinc-800"
                                disabled={addressSaving}
                                onClick={() => setAddressEditing(false)}
                            >
                                취소
                            </button>
                        </div>
                    )}
                </div>

                {!allowAddressChange && (
                    <p className="text-[11px] text-zinc-500 mb-2">
                        배송이 시작된 주문은 배송지 변경이 불가합니다.
                    </p>
                )}

                {!addressEditing ? (
                    <div className="space-y-1 text-xs md:text-sm text-zinc-300">
                        {addressSummary ? <div>{addressSummary}</div> : <div className="text-zinc-500">배송지 정보 없음</div>}
                        {data.receiverName && <div>수령인: {data.receiverName}</div>}
                        {data.receiverPhone && <div>연락처: {data.receiverPhone}</div>}
                        {data.memo && <div className="text-zinc-400">요청사항: {data.memo}</div>}
                    </div>
                ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">수령인</div>
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                                    value={addrForm.receiverName}
                                    onChange={(e) => setAddrForm((p) => ({ ...p, receiverName: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">연락처</div>
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                                    value={addrForm.receiverPhone}
                                    onChange={(e) => setAddrForm((p) => ({ ...p, receiverPhone: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">우편번호</div>
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                                    value={addrForm.receiverZipCode}
                                    onChange={(e) => setAddrForm((p) => ({ ...p, receiverZipCode: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <div className="text-xs text-zinc-400">주소</div>
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                                    value={addrForm.receiverAddress}
                                    onChange={(e) => setAddrForm((p) => ({ ...p, receiverAddress: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <div className="text-xs text-zinc-400">상세주소</div>
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                                    value={addrForm.receiverDetailAddress}
                                    onChange={(e) =>
                                        setAddrForm((p) => ({ ...p, receiverDetailAddress: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <div className="text-xs text-zinc-400">요청사항(메모)</div>
                                <input
                                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                                    value={addrForm.memo}
                                    onChange={(e) => setAddrForm((p) => ({ ...p, memo: e.target.value }))}
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-zinc-500">
                            * 주소 변경은 배송 진행 단계에 따라 제한될 수 있습니다. (백엔드에서 검증 권장)
                        </p>
                    </div>
                )}
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
