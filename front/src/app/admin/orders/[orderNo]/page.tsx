// src/app/admin/order/[orderNo]/page.tsx
"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

type OrderStatus =
    | "PENDING"
    | "PAID"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELED"
    | "REFUNDED";

interface ErrorBody {
    resMessage?: string;
    message?: string;
}

interface OrderItemRes {
    itemNo: number;
    itemNameSnapshot: string;
    itemOptionSnapshot?: string | null;
    itemImageSnapshot?: string | null;
    priceAtOrder: number;
    quantity: number;
    lineTotal: number;
}

interface AdminDetailOrderRes {
    memberEmail: string;
    orderNo: number;
    orderStatus: OrderStatus;
    createdAt: string;
    updatedAt: string | null;
    tossPaymentStatus?: string | null;

    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverDetailAddress?: string | null;
    receiverZipCode?: string | null;
    memo?: string | null;

    items: OrderItemRes[];
}

interface AdminUpdateOrderAddressReq {
    orderNo: number;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverDetailAddress?: string | null;
    receiverZipCode?: string | null;
    memo?: string | null;
}

interface CancelOrderReq {
    orderNo: number;
    orderItemNos?: number[] | null;
    cancelReason?: string;
}

const statusLabel = (s: OrderStatus) => {
    switch (s) {
        case "PENDING":
            return "결제대기";
        case "PAID":
            return "결제완료";
        case "SHIPPED":
            return "배송중";
        case "DELIVERED":
            return "배송완료";
        case "CANCELED":
            return "취소";
        case "REFUNDED":
            return "환불완료";
        default:
            return s;
    }
};

const formatDateTime = (t: string | null | undefined) =>
    t ? new Date(t).toLocaleString("ko-KR") : "-";
const formatPrice = (n: number) =>
    `${n.toLocaleString("ko-KR")}원`;

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

export default function AdminOrderDetailPage() {
    const params = useParams<{ orderNo: string }>();
    const router = useRouter();
    const orderNo = Number(params.orderNo);

    const [detail, setDetail] = useState<AdminDetailOrderRes | null>(
        null
    );
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 배송지 폼
    const [addrForm, setAddrForm] =
        useState<AdminUpdateOrderAddressReq | null>(null);
    const [addrSaving, setAddrSaving] = useState(false);

    // 전체/부분 취소
    const [cancelReasonAll, setCancelReasonAll] = useState("");
    const [cancelReasonPartial, setCancelReasonPartial] =
        useState("");
    const [selectedItemNos, setSelectedItemNos] = useState<
        number[]
    >([]);
    const [cancelProcessing, setCancelProcessing] =
        useState(false);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            const res = await apiClient.get<AdminDetailOrderRes>(
                `/admin/order/${orderNo}`
            );
            const data = res.data;
            setDetail(data);

            setAddrForm({
                orderNo,
                receiverName: data.receiverName,
                receiverPhone: data.receiverPhone,
                receiverAddress: data.receiverAddress,
                receiverDetailAddress:
                    data.receiverDetailAddress ?? "",
                receiverZipCode: data.receiverZipCode ?? "",
                memo: data.memo ?? "",
            });

            setSelectedItemNos([]);
        } catch (err) {
            const msg = extractError(
                err,
                "주문 상세를 불러오지 못했습니다."
            );
            setErrorMsg(msg);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!Number.isNaN(orderNo)) {
            fetchDetail();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderNo]);

    const changeStatus = async (newStatus: OrderStatus) => {
        if (!detail) return;
        if (
            !confirm(
                `주문 상태를 '${statusLabel(
                    newStatus
                )}'(으)로 변경하시겠습니까?`
            )
        )
            return;

        try {
            await apiClient.patch("/admin/order/status", {
                orderNo: detail.orderNo,
                orderStatus: newStatus,
            });

            alert("상태를 변경했습니다.");
            fetchDetail();
        } catch (err) {
            alert(
                extractError(err, "상태 변경에 실패했습니다.")
            );
            console.error(err);
        }
    };

    const handleAddrChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!addrForm) return;
        const { name, value } = e.target;
        setAddrForm({
            ...addrForm,
            [name]: value,
        });
    };

    const saveAddress = async () => {
        if (!addrForm) return;
        if (!confirm("배송 정보를 수정하시겠습니까?")) return;

        try {
            setAddrSaving(true);
            await apiClient.patch("/admin/order/address", {
                ...addrForm,
                orderNo,
            });
            alert("배송 정보를 수정했습니다.");
            fetchDetail();
        } catch (err) {
            alert(
                extractError(err, "배송지 수정에 실패했습니다.")
            );
            console.error(err);
        } finally {
            setAddrSaving(false);
        }
    };

    const cancelAll = async () => {
        if (!detail) return;
        if (
            !confirm(
                `주문번호 ${detail.orderNo} 를 전체 취소하시겠습니까?`
            )
        )
            return;

        const body: CancelOrderReq = {
            orderNo: detail.orderNo,
            orderItemNos: null,
            cancelReason: cancelReasonAll || undefined,
        };

        try {
            setCancelProcessing(true);
            await apiClient.patch(
                "/admin/order/cancel/all",
                body
            );
            alert("전체 취소가 완료되었습니다.");
            router.push("/admin/order");
        } catch (err) {
            alert(
                extractError(err, "전체 취소에 실패했습니다.")
            );
            console.error(err);
        } finally {
            setCancelProcessing(false);
        }
    };

    const toggleItem = (itemNo: number) => {
        setSelectedItemNos((prev) =>
            prev.includes(itemNo)
                ? prev.filter((n) => n !== itemNo)
                : [...prev, itemNo]
        );
    };

    const cancelPartial = async () => {
        if (!detail) return;
        if (selectedItemNos.length === 0) {
            alert("부분 취소할 상품을 선택하세요.");
            return;
        }
        if (
            !confirm(
                `선택된 ${selectedItemNos.length}개 상품을 부분 취소하시겠습니까?`
            )
        )
            return;

        const body: CancelOrderReq = {
            orderNo: detail.orderNo,
            orderItemNos: selectedItemNos,
            cancelReason: cancelReasonPartial || undefined,
        };

        try {
            setCancelProcessing(true);
            await apiClient.patch(
                `/admin/order/${detail.orderNo}/cancel-items`,
                body
            );
            alert("부분 취소가 완료되었습니다.");
            setCancelReasonPartial("");
            setSelectedItemNos([]);
            fetchDetail();
        } catch (err) {
            alert(
                extractError(err, "부분 취소에 실패했습니다.")
            );
            console.error(err);
        } finally {
            setCancelProcessing(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-black text-white px-10 py-8 flex flex-col gap-6">
            {/* 상단 헤더 + 뒤로가기 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        주문 상세
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        주문번호 {orderNo}
                    </p>
                </div>
                <button
                    className="px-4 py-2 text-xs border border-neutral-700 rounded-xl hover:bg-neutral-800"
                    onClick={() => router.push("/admin/order")}
                >
                    목록으로
                </button>
            </div>

            {loading && (
                <div className="text-sm text-neutral-400">
                    불러오는 중…
                </div>
            )}
            {errorMsg && (
                <div className="text-sm text-red-400">{errorMsg}</div>
            )}

            {detail && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 왼쪽: 주문/배송/상품 */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* 주문 기본 정보 */}
                        <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="text-xs text-neutral-400">
                                        주문번호
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {detail.orderNo}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="px-3 py-1 rounded-full bg-neutral-900 text-[11px]">
                                        {statusLabel(
                                            detail.orderStatus
                                        )}
                                    </span>
                                    <span className="text-[11px] text-neutral-400">
                                        결제상태 :{" "}
                                        {detail.tossPaymentStatus ??
                                            "-"}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-1 text-xs text-neutral-300">
                                <div>
                                    <span className="text-neutral-500">
                                        주문자
                                    </span>
                                    <div>{detail.memberEmail}</div>
                                </div>
                                <div>
                                    <span className="text-neutral-500">
                                        주문일
                                    </span>
                                    <div>
                                        {formatDateTime(
                                            detail.createdAt
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-neutral-500">
                                        변경일
                                    </span>
                                    <div>
                                        {formatDateTime(
                                            detail.updatedAt
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 배송 정보 + 수정 */}
                        <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 text-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold">
                                    배송 정보
                                </span>
                            </div>

                            {addrForm && (
                                <div className="grid grid-cols-1 gap-2">
                                    <div>
                                        <div className="text-neutral-500 mb-1">
                                            수령인
                                        </div>
                                        <input
                                            name="receiverName"
                                            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-1.5"
                                            value={addrForm.receiverName}
                                            onChange={handleAddrChange}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-neutral-500 mb-1">
                                            연락처
                                        </div>
                                        <input
                                            name="receiverPhone"
                                            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-1.5"
                                            value={addrForm.receiverPhone}
                                            onChange={handleAddrChange}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-neutral-500 mb-1">
                                            우편번호
                                        </div>
                                        <input
                                            name="receiverZipCode"
                                            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-1.5"
                                            value={
                                                addrForm.receiverZipCode ??
                                                ""
                                            }
                                            onChange={handleAddrChange}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-neutral-500 mb-1">
                                            주소
                                        </div>
                                        <input
                                            name="receiverAddress"
                                            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-1.5"
                                            value={addrForm.receiverAddress}
                                            onChange={handleAddrChange}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-neutral-500 mb-1">
                                            상세 주소
                                        </div>
                                        <input
                                            name="receiverDetailAddress"
                                            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-1.5"
                                            value={
                                                addrForm.receiverDetailAddress ??
                                                ""
                                            }
                                            onChange={handleAddrChange}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-neutral-500 mb-1">
                                            요청 메모
                                        </div>
                                        <textarea
                                            name="memo"
                                            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-1.5 h-16 resize-none"
                                            value={addrForm.memo ?? ""}
                                            onChange={handleAddrChange}
                                        />
                                    </div>

                                    <button
                                        className="mt-1 w-full px-3 py-2 text-[11px] border border-neutral-600 rounded-lg hover:bg-neutral-800 disabled:opacity-50"
                                        onClick={saveAddress}
                                        disabled={addrSaving}
                                    >
                                        {addrSaving
                                            ? "저장 중…"
                                            : "배송 정보 저장"}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* 상품 목록 + 부분취소 선택 */}
                        <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 text-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold">
                                    주문 상품
                                </span>
                                <span className="text-[11px] text-neutral-500">
                                    부분 취소할 상품 선택 가능
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                {detail.items.map((item) => (
                                    <label
                                        key={`${item.itemNo}-${item.itemNameSnapshot}`}
                                        className="flex gap-2 items-start border border-neutral-800 rounded-xl px-3 py-2 bg-black/40"
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-1"
                                            checked={selectedItemNos.includes(
                                                item.itemNo
                                            )}
                                            onChange={() =>
                                                toggleItem(
                                                    item.itemNo
                                                )
                                            }
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-neutral-100">
                                                {item.itemNameSnapshot}
                                            </div>
                                            {item.itemOptionSnapshot && (
                                                <div className="text-neutral-400">
                                                    옵션:{" "}
                                                    {
                                                        item.itemOptionSnapshot
                                                    }
                                                </div>
                                            )}
                                            <div className="flex justify-between mt-1 text-neutral-300">
                                                <span>
                                                    수량{" "}
                                                    {
                                                        item.quantity
                                                    }
                                                    개
                                                </span>
                                                <span>
                                                    {formatPrice(
                                                        item.lineTotal
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* 오른쪽: 관리자 액션 */}
                    <div className="flex flex-col gap-4">
                        {/* 상태 변경 */}
                        <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 text-xs">
                            <div className="text-sm font-semibold mb-2">
                                상태 변경
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="px-3 py-1 border border-neutral-700 rounded-xl hover:bg-neutral-800"
                                    onClick={() =>
                                        changeStatus("PAID")
                                    }
                                >
                                    결제완료
                                </button>
                                <button
                                    className="px-3 py-1 border border-neutral-700 rounded-xl hover:bg-neutral-800"
                                    onClick={() =>
                                        changeStatus("SHIPPED")
                                    }
                                >
                                    배송중
                                </button>
                                <button
                                    className="px-3 py-1 border border-neutral-700 rounded-xl hover:bg-neutral-800"
                                    onClick={() =>
                                        changeStatus("DELIVERED")
                                    }
                                >
                                    배송완료
                                </button>
                                <button
                                    className="px-3 py-1 border border-neutral-700 rounded-xl hover:bg-neutral-800"
                                    onClick={() =>
                                        changeStatus("CANCELED")
                                    }
                                >
                                    주문취소
                                </button>
                                <button
                                    className="px-3 py-1 border border-neutral-700 rounded-xl hover:bg-neutral-800"
                                    onClick={() =>
                                        changeStatus("REFUNDED")
                                    }
                                >
                                    환불완료
                                </button>
                            </div>
                        </section>

                        {/* 전체 취소 */}
                        <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 text-xs">
                            <div className="text-sm font-semibold mb-2">
                                전체 취소
                            </div>
                            <textarea
                                className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 h-20 resize-none text-[11px]"
                                placeholder="전체 취소 사유 (선택)"
                                value={cancelReasonAll}
                                onChange={(e) =>
                                    setCancelReasonAll(
                                        e.target.value
                                    )
                                }
                            />
                            <button
                                className="mt-2 w-full px-3 py-2 rounded-lg text-[11px] border border-red-500 text-red-500 hover:bg-red-900/40 disabled:opacity-50"
                                onClick={cancelAll}
                                disabled={cancelProcessing}
                            >
                                전체 취소 실행
                            </button>
                        </section>

                        {/* 부분 취소 */}
                        <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 text-xs">
                            <div className="text-sm font-semibold mb-2">
                                부분 취소 (선택 상품)
                            </div>
                            <textarea
                                className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 h-20 resize-none text-[11px]"
                                placeholder="부분 취소 사유 (선택)"
                                value={cancelReasonPartial}
                                onChange={(e) =>
                                    setCancelReasonPartial(
                                        e.target.value
                                    )
                                }
                            />
                            <button
                                className="mt-2 w-full px-3 py-2 rounded-lg text-[11px] border border-orange-500 text-orange-400 hover:bg-orange-900/40 disabled:opacity-50"
                                onClick={cancelPartial}
                                disabled={cancelProcessing}
                            >
                                선택 상품 부분 취소 실행
                            </button>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}
