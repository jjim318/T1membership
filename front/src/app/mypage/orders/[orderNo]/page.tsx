// src/app/mypage/orders/[orderNo]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/apiClient";

type OrderStatus = string;

// =========================
// 🔥 백엔드 API BASE
// =========================
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * =========================
 * 🔥 주문/스냅샷 이미지 URL 정규화
 * =========================
 */
function toImageSrc(raw?: string | null): string {
    if (!raw) return "";

    const url = raw.trim();
    if (!url) return "";

    // 1️⃣ 절대 URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    // 2️⃣ /files/xxx
    if (url.startsWith("/files/")) {
        const fileName = url.replace("/files/", "");
        return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
    }

    // 3️⃣ files/xxx
    if (url.startsWith("files/")) {
        const fileName = url.replace("files/", "");
        return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
    }

    // 4️⃣ 파일명만 오는 경우
    if (!url.includes("/")) {
        return `${API_BASE}/files/${encodeURIComponent(url)}`;
    }

    // 5️⃣ 그 외 이상한 경로 → 파일명만 추출해서 /files로 보정
    console.warn("[OrderDetail] 예상치 못한 이미지 경로 → 보정 처리:", url);
    const fileName = url.split("/").pop();
    if (!fileName) return "";

    return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
}

// 🔥 라인 정보 (백엔드 UserDetailOrderRes에 맞춰야 함)
interface OrderItemRes {
    orderItemNo: number; // 부분 취소용 PK
    itemNo: number | null;
    itemNameSnapshot: string;
    itemOptionSnapshot?: string | null;
    itemImageSnapshot?: string | null;
    priceAtOrder: number;
    quantity: number;
    lineTotal: number;

    // 🔥 MD / POP / MEMBERSHIP 등
    itemCategorySnapshot?: string | null;
}

// 백엔드 UserDetailOrderRes 타입
interface UserDetailOrderRes {
    orderNo: number;
    orderStatus: OrderStatus;
    createdAt: string;
    updatedAt: string;
    orderTotalPrice: number;

    paymentMethod?: string | null;
    paymentStatus?: string | null;

    receiverName?: string | null;
    receiverPhone?: string | null;
    receiverAddress?: string | null;
    receiverDetailAddress?: string | null;
    receiverZipCode?: string | null;
    memo?: string | null;

    items: OrderItemRes[];

    membershipPlanCode?: string | null;
    membershipPayType?: string | null;
    membershipMonths?: number | null;
    membershipStartDate?: string | null;
    membershipEndDate?: string | null;
}

// 🔥 취소 요청/응답 타입
interface CancelOrderReq {
    orderNo: number;
    reason: string;
    orderItemNos?: number[] | null;
}

interface CancelOrderRes {
    orderNo: number;
    orderStatus: string;
}

// ✅ (권장) orderNo로 결제 재시도 prepare 응답(백엔드가 만들어줘야 함)
interface PrepareByOrderRes {
    orderNo?: number;
    orderId: string;
    amount: number;
    orderName: string;
}

// ✅ 상품 상세 응답에서 우리가 필요한 최소 타입
// (샵 상세 페이지에서 data.images[0].fileName을 쓰고 있으므로 동일하게 가져옴)
interface ItemReadOneRes {
    images?: Array<{
        fileName?: string | null;
        sortOrder?: number | null;
        url?: string | null;
    }>;
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

// 🔥 상태 한글 라벨
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
    if (upper.includes("SHIP") || upper.includes("DELIVERY")) return "배송 중";
    if (upper.includes("DELIVERED") || upper.includes("DELIVERY_COMPLETE")) return "배송 완료";
    if (upper.includes("CANCEL")) return "취소 완료";
    if (upper.includes("REFUND")) return "환불 완료";

    return status;
}

function isPartiallyCanceled(status: OrderStatus): boolean {
    const upper = (status ?? "").toUpperCase();
    return (
        upper === "PARTIALLY_CANCELED" ||
        upper === "PARTIAL_CANCEL" ||
        (upper.includes("PART") && upper.includes("CANCEL"))
    );
}

function isUserCancelableStatus(status: OrderStatus): boolean {
    const upper = (status ?? "").toUpperCase();
    return upper === "ORDERED" || upper === "PAID";
}

function isMdItem(item: OrderItemRes): boolean {
    const cat = (item.itemCategorySnapshot ?? "").toUpperCase();
    return cat === "MD";
}

function isOrdered(status: OrderStatus): boolean {
    return (status ?? "").toUpperCase() === "ORDERED";
}

function getMembershipDisplayName(planCode?: string | null): string {
    if (!planCode) return "멤버십 상품";

    switch (planCode) {
        case "T1-2025-MONTHLY":
            return "2025 T1 멤버십 (월간)";
        case "T1-2025-YEARLY":
            return "2025 T1 멤버십 (연간)";
        default:
            return "멤버십 상품";
    }
}

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderNoParam = params?.orderNo;

    const [data, setData] = useState<UserDetailOrderRes | null>(null);
    const [loading, setLoading] = useState(true);

    // 🔥 취소 진행 중 상태
    const [cancelAllLoading, setCancelAllLoading] = useState(false);
    const [cancelItemLoading, setCancelItemLoading] = useState<number | null>(null);

    // ✅ 결제 진행(재시도) 로딩
    const [payNowLoading, setPayNowLoading] = useState(false);

    // ✅✅✅ 우회용: itemNo -> 썸네일 URL 맵
    const [thumbMap, setThumbMap] = useState<Record<number, string>>({});
    const [thumbLoadingSet, setThumbLoadingSet] = useState<Set<number>>(new Set());

    const reloadDetail = async (orderNo: string | string[]) => {
        const res = await apiClient.get<UserDetailOrderRes>(`/order/${orderNo}`);
        setData(res.data);
    };

    useEffect(() => {
        if (!orderNoParam) return;

        const load = async () => {
            try {
                if (typeof window !== "undefined") {
                    const token = localStorage.getItem("accessToken");
                    if (!token) {
                        alert("로그인이 필요합니다.");
                        router.replace("/login");
                        return;
                    }
                }

                await reloadDetail(orderNoParam);
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

    const items = data?.items ?? [];

    // ✅✅✅ 주문 상세가 뜬 뒤, itemNo로 상품 상세를 불러와 썸네일을 맵에 채움
    useEffect(() => {
        const loadThumbs = async () => {
            if (!data) return;
            if (!data.items || data.items.length === 0) return;

            // itemNo 있는 것만
            const itemNos = data.items
                .map((it) => it.itemNo)
                .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

            // 중복 제거
            const unique = Array.from(new Set(itemNos));

            // 이미 thumbMap에 있거나, 이미 로딩 시도 중인 것은 제외
            const need = unique.filter((no) => !thumbMap[no] && !thumbLoadingSet.has(no));
            if (need.length === 0) return;

            // 로딩 중 표시
            setThumbLoadingSet((prev) => {
                const next = new Set(prev);
                need.forEach((n) => next.add(n));
                return next;
            });

            try {
                const entries = await Promise.all(
                    need.map(async (no) => {
                        // ✅ 형님 프로젝트에서 상품 상세는 이미 여기로 쓰고 있음
                        const res = await apiClient.get<any>(`/item/${no}`);

                        // ApiResult 래핑/비래핑 모두 커버 (샵 페이지는 ApiResult로 받음)
                        const payload: ItemReadOneRes = res.data?.result ?? res.data;

                        const imgs = payload.images ?? [];
                        const sorted = [...imgs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

                        const rawThumb = sorted[0]?.fileName ?? sorted[0]?.url ?? null;
                        const fixed = toImageSrc(rawThumb);

                        return [no, fixed] as const;
                    }),
                );

                setThumbMap((prev) => {
                    const next = { ...prev };
                    for (const [no, url] of entries) {
                        if (url) next[no] = url;
                    }
                    return next;
                });
            } catch (e) {
                console.error("[OrderDetail] thumb load error", e);
            } finally {
                // 로딩 중 해제
                setThumbLoadingSet((prev) => {
                    const next = new Set(prev);
                    need.forEach((n) => next.delete(n));
                    return next;
                });
            }
        };

        void loadThumbs();
        // data가 바뀌면 다시 시도(취소 후 reloadDetail 등)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const isMembershipOrder = useMemo(() => {
        if (!data) return false;
        return !!data.membershipPlanCode && items.length === 0;
    }, [data, items.length]);

    const partiallyCanceled = useMemo(() => {
        if (!data) return false;
        return isPartiallyCanceled(data.orderStatus);
    }, [data]);

    const canCancelAll = useMemo(() => {
        if (!data) return false;
        return (
            !isMembershipOrder &&
            !partiallyCanceled &&
            items.length > 0 &&
            isUserCancelableStatus(data.orderStatus) &&
            items.every((it) => isMdItem(it))
        );
    }, [data, isMembershipOrder, partiallyCanceled, items]);

    const canCancelItem = (item: OrderItemRes): boolean => {
        if (!data) return false;
        if (isMembershipOrder) return false;
        if (!isUserCancelableStatus(data.orderStatus)) return false;
        return isMdItem(item);
    };

    const canPayNow = useMemo(() => {
        if (!data) return false;
        return (
            !isMembershipOrder &&
            !partiallyCanceled &&
            items.length > 0 &&
            isOrdered(data.orderStatus) &&
            items.every((it) => isMdItem(it))
        );
    }, [data, isMembershipOrder, partiallyCanceled, items]);

    const handlePayNow = async () => {
        if (!data) return;
        if (!canPayNow) {
            alert("결제 대기 상태의 MD 주문만 결제를 진행할 수 있습니다.");
            return;
        }

        const ok = window.confirm("결제 대기 중인 주문입니다.\n지금 결제를 진행하시겠습니까?");
        if (!ok) return;

        setPayNowLoading(true);
        try {
            const prepareRes = await apiClient.post<any>("/pay/toss/prepare-by-order", {
                orderNo: data.orderNo,
            });

            const payload: PrepareByOrderRes = prepareRes.data?.result ?? prepareRes.data?.data ?? prepareRes.data;

            const orderId = payload?.orderId;
            const amount = payload?.amount;
            const orderName = payload?.orderName;

            if (!orderId || !amount || !orderName) {
                router.push(`/order/goods/checkout?orderNo=${data.orderNo}`);
                return;
            }

            router.push(
                `/order/goods/checkout?orderNo=${data.orderNo}&orderId=${encodeURIComponent(
                    orderId,
                )}&amount=${amount}&orderName=${encodeURIComponent(orderName)}`,
            );
        } catch (e) {
            console.error("[OrderDetail] pay now error", e);
            if (axios.isAxiosError(e)) {
                const msg = (e.response?.data as any)?.resMessage || (e.response?.data as any)?.message || "결제 진행에 실패했습니다.";
                alert(msg);
            } else {
                alert("결제 진행에 실패했습니다.");
            }
        } finally {
            setPayNowLoading(false);
        }
    };

    const handleCancelAll = async () => {
        if (!data) return;
        if (!canCancelAll) {
            alert("MD 상품으로만 구성된 주문이 아니거나, 취소 가능한 상태가 아닙니다.");
            return;
        }

        const ok = window.confirm("주문을 전체 취소하시겠습니까?\n(멤버십/POP 주문은 여기서 취소되지 않습니다.)");
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

            await apiClient.patch<CancelOrderRes>("/order/cancel/all", body);

            alert("주문 전체 취소가 접수되었습니다.");
            router.replace("/mypage/orders");
        } catch (e) {
            console.error("[OrderDetail] cancel all error", e);
            if (axios.isAxiosError(e)) {
                const msg = (e.response?.data as any)?.resMessage || (e.response?.data as any)?.message || "주문 전체 취소에 실패했습니다.";
                alert(msg);
            } else {
                alert("주문 전체 취소에 실패했습니다.");
            }
        } finally {
            setCancelAllLoading(false);
        }
    };

    const handleCancelItem = async (item: OrderItemRes) => {
        if (!data) return;
        if (!canCancelItem(item)) {
            alert("MD 상품이 아니거나, 취소 가능한 상태가 아닙니다.");
            return;
        }

        const ok = window.confirm(
            `해당 상품을 취소하시겠습니까?\n\n상품명: ${item.itemNameSnapshot}\n수량: ${item.quantity}개`,
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

            await apiClient.patch<CancelOrderRes>(`/order/${data.orderNo}/cancel-items`, body);

            alert("해당 상품 취소가 접수되었습니다.");

            await reloadDetail(String(data.orderNo));
        } catch (e) {
            console.error("[OrderDetail] cancel item error", e);
            if (axios.isAxiosError(e)) {
                const msg = (e.response?.data as any)?.resMessage || (e.response?.data as any)?.message || "상품 취소에 실패했습니다.";
                alert(msg);
            } else {
                alert("상품 취소에 실패했습니다.");
            }
        } finally {
            setCancelItemLoading(null);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-black text-white pt-16 flex items-center justify-center">
                <span className="text-sm text-zinc-400">주문 상세를 불러오는 중입니다…</span>
            </main>
        );
    }

    if (!data) {
        return (
            <main className="min-h-screen bg-black text-white pt-16 flex items-center justify-center">
                <span className="text-sm text-zinc-400">주문 정보를 찾을 수 없습니다.</span>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white pt-16">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                {/* 상단: 날짜 + 주문 번호 + 상태 */}
                <section className="mb-4">
                    <h1 className="text-xl md:text-2xl font-bold">{formatDate(data.createdAt)} 주문</h1>
                    <p className="mt-1 text-xs md:text-sm text-zinc-400">주문 번호 {data.orderNo}</p>
                    <p className="mt-1 text-xs md:text-sm text-zinc-300">현재 상태: {getStatusLabel(data.orderStatus)}</p>
                </section>

                {/* 안내 바 */}
                <section className="space-y-2 mb-4 text-[11px] md:text-xs text-zinc-300">
                    {partiallyCanceled && <div className="rounded-md bg-zinc-800 px-3 py-2">일부 상품이 취소된 주문입니다.</div>}

                    {canPayNow && (
                        <div className="rounded-md bg-zinc-800 px-3 py-2">
                            결제 대기 중인 MD 주문입니다. 아래 <b className="text-white">결제하기</b> 버튼으로 결제를 완료할 수 있습니다.
                        </div>
                    )}

                    {isMembershipOrder ? (
                        <>
                            <div className="rounded-md bg-zinc-800 px-3 py-2">
                                온라인 멤버십 이용권이에요. 배송 없이 계정에 바로 적용되는 상품입니다.
                            </div>
                            <div className="rounded-md bg-zinc-800 px-3 py-2">
                                멤버십 해지 및 환불 규정은 안내 페이지를 꼭 확인해 주세요.
                            </div>
                        </>
                    ) : (
                        <div className="rounded-md bg-zinc-800 px-3 py-2">
                            MD 상품은 결제 대기/결제 완료 상태에서 취소/환불 신청이 가능합니다. POP 및 멤버십 상품은 고객센터를 통해 문의해
                            주세요.
                        </div>
                    )}
                </section>

                {/* 주문 상품 리스트 */}
                {!isMembershipOrder && items.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm md:text-base font-semibold mb-3">주문 상품</h2>
                        <ul className="space-y-3">
                            {items.map((item, idx) => {
                                const md = isMdItem(item);
                                const itemCancelable = canCancelItem(item);

                                // 1) 스냅샷이 있으면 그걸 우선 (현재는 null이라 대부분 비어있을 것)
                                const snapThumb = toImageSrc(item.itemImageSnapshot);

                                // 2) 우회: itemNo로 가져온 썸네일
                                const liveThumb =
                                    typeof item.itemNo === "number" ? (thumbMap[item.itemNo] ?? "") : "";

                                // 최종 썸네일
                                const finalThumb = snapThumb || liveThumb || "/icons/t1.png";

                                return (
                                    <li
                                        key={`${item.orderItemNo}-${idx}`}
                                        className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-xs md:text-sm"
                                    >
                                        {/* 썸네일 */}
                                        <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={finalThumb}
                                                alt={item.itemNameSnapshot}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const el = e.currentTarget;
                                                    if (el.src.includes("/icons/t1.png")) return;
                                                    el.src = "/icons/t1.png";
                                                }}
                                            />
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="font-semibold truncate">{item.itemNameSnapshot}</div>

                                            {item.itemOptionSnapshot && (
                                                <div className="mt-0.5 text-[11px] md:text-xs text-zinc-400">{item.itemOptionSnapshot}</div>
                                            )}

                                            <div className="mt-1 text-[11px] md:text-xs text-zinc-400">
                                                개당 {formatMoney(item.priceAtOrder)}원 · 수량 {item.quantity}개
                                            </div>

                                            {md && <div className="mt-1 text-[11px] md:text-xs text-emerald-400">MD 상품</div>}
                                        </div>

                                        {/* 금액 + 취소 버튼/문구 */}
                                        <div className="text-right flex flex-col justify-between items-end gap-2">
                                            <div className="text-sm md:text-base font-semibold">{formatMoney(item.lineTotal)}원</div>

                                            {itemCancelable ? (
                                                <button
                                                    type="button"
                                                    className="px-2 py-1 rounded-lg border border-zinc-700 text-[11px] md:text-xs hover:bg-zinc-800 disabled:opacity-60"
                                                    disabled={cancelItemLoading === item.orderItemNo}
                                                    onClick={() => handleCancelItem(item)}
                                                >
                                                    {cancelItemLoading === item.orderItemNo ? "취소 처리 중…" : "이 상품 취소"}
                                                </button>
                                            ) : (
                                                <span className="text-[11px] md:text-xs text-zinc-500">취소/환불 불가</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* 멤버십 주문일 때 멤버십 정보 */}
                {isMembershipOrder && (
                    <section className="mb-8">
                        <h2 className="text-sm md:text-base font-semibold mb-4">멤버십 정보</h2>
                        <dl className="space-y-2 text-xs md:text-sm">
                            <div className="flex justify-between">
                                <dt className="text-zinc-500">이용권</dt>
                                <dd className="text-zinc-100">{getMembershipDisplayName(data.membershipPlanCode)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-zinc-500">결제 방식</dt>
                                <dd className="text-zinc-100">{data.membershipPayType ?? "-"}</dd>
                            </div>
                            {data.membershipStartDate && data.membershipEndDate && (
                                <div className="flex justify-between">
                                    <dt className="text-zinc-500">이용 기간</dt>
                                    <dd className="text-zinc-100">
                                        {formatDate(data.membershipStartDate)} ~ {formatDate(data.membershipEndDate)}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>
                )}

                <hr className="border-zinc-800 mb-6" />

                {/* 결제 정보 */}
                <section className="mb-8">
                    <h2 className="text-sm md:text-base font-semibold mb-4">결제 정보</h2>

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
                            <dd>{data.paymentMethod ?? "결제 수단 정보 없음"}</dd>
                        </div>
                    </dl>
                </section>

                {/* 주문자 / 배송 정보 */}
                <section className="mb-10">
                    <h2 className="text-sm md:text-base font-semibold mb-3">주문자</h2>
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
                        <h3 className="text-xs md:text-sm font-semibold mb-2">배송지 정보</h3>
                        <div className="space-y-1 text-xs md:text-sm text-zinc-300">
                            {data.receiverZipCode || data.receiverAddress || data.receiverDetailAddress ? (
                                <>
                                    <div>
                                        {data.receiverZipCode ? `[${data.receiverZipCode}] ` : ""}
                                        {data.receiverAddress ?? ""} {data.receiverDetailAddress ?? ""}
                                    </div>
                                    {data.memo && <div className="text-zinc-400">요청사항: {data.memo}</div>}
                                </>
                            ) : (
                                <div className="text-zinc-500">배송지 정보 없음</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 하단 버튼 */}
                <section className="mb-4 space-y-2">
                    {canPayNow && (
                        <button
                            type="button"
                            className="w-full py-3 rounded-xl bg-white text-black text-sm md:text-base font-semibold hover:bg-zinc-200 disabled:opacity-60"
                            disabled={payNowLoading}
                            onClick={handlePayNow}
                        >
                            {payNowLoading ? "결제 창 여는 중…" : "결제하기"}
                        </button>
                    )}

                    {canCancelAll && (
                        <button
                            type="button"
                            className="w-full py-3 rounded-xl bg-red-600 text-sm md:text-base font-semibold hover:bg-red-500 disabled:opacity-60"
                            disabled={cancelAllLoading}
                            onClick={handleCancelAll}
                        >
                            {cancelAllLoading ? "전체 취소 처리 중…" : "주문 전체 취소"}
                        </button>
                    )}

                    <button
                        type="button"
                        className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm md:text-base hover:bg-zinc-800"
                        onClick={() => alert("고객센터 페이지는 추후 구현 예정입니다.")}
                    >
                        고객센터
                    </button>
                </section>
            </div>
        </main>
    );
}
