// src/app/mypage/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/apiClient";

interface SummaryOrderRes {
    orderNo: number;
    memberEmail?: string;
    orderDate: string;
    orderTotalPrice: number;
    orderStatus: string;
    itemCount?: number | null;
    itemName?: string | null;
    itemCategory?: string | null; // "MD" | "POP" | "MEMBERSHIP" | null
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

type CategoryTab = "ALL" | "PRODUCT" | "PASS" | "DONATION" | "MEMBERSHIP" | "TICKET";
type StatusFilter = "ALL" | "CANCEL";

// ✅ 주문상세(/order/{orderNo})에서 필요한 최소 타입
interface OrderDetailLite {
    orderNo: number;
    items?: Array<{
        itemNo: number | null;
        itemImageSnapshot?: string | null;
    }>;
    membershipPlanCode?: string | null;
}

// ✅ 상품상세(/item/{itemNo})에서 필요한 최소 타입
interface ItemReadOneLite {
    images?: Array<{
        fileName?: string | null;
        sortOrder?: number | null;
        url?: string | null;
    }>;
}

// =========================
// 🔥 백엔드 API BASE
// =========================
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * ✅ 이미지 URL 정규화 규칙
 * - 절대URL(http/https) 그대로
 * - /files/**  → API_BASE + encodeURIComponent(fileName)
 * - files/**   → API_BASE + encodeURIComponent(fileName)
 * - 파일명만 오는 경우 → /files/{encodeURIComponent(fileName)}
 * - 그 외 → 파일명만 뽑아서 /files로 보정
 */
function toImageSrc(raw?: string | null, context = "MyOrders"): string {
    if (!raw) return "";

    const url = raw.trim();
    if (!url) return "";

    // 1) 절대 URL
    if (/^https?:\/\//i.test(url)) return url;

    // 2) /files/**
    if (url.startsWith("/files/")) {
        const fileName = url.replace("/files/", "");
        return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
    }

    // 3) files/**
    if (url.startsWith("files/")) {
        const fileName = url.replace("files/", "");
        return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
    }

    // 4) 파일명만 오는 경우
    if (!url.includes("/")) {
        return `${API_BASE}/files/${encodeURIComponent(url)}`;
    }

    // 5) 그 외 보정
    console.warn(`[${context}] 예상치 못한 경로 → /files로 강제 보정:`, url);
    const fileName = url.split("/").pop();
    if (!fileName) return "";
    return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}.${m}.${day}`;
}

function formatMoney(value: number): string {
    return Number(value ?? 0).toLocaleString("ko-KR");
}

// 결제대기 숨김
function isHiddenStatus(status: string): boolean {
    return (status ?? "").toUpperCase() === "PAYMENT_PENDING";
}

function isCancelReturnRefund(status: string): boolean {
    const upper = (status ?? "").toUpperCase();
    return upper.includes("CANCEL") || upper.includes("REFUND") || upper.includes("RETURN");
}

function getStatusLabel(status: string): string {
    const upper = (status ?? "").toUpperCase();

    if (
        upper === "PARTIALLY_CANCELED" ||
        upper === "PARTIAL_CANCEL" ||
        (upper.includes("PART") && upper.includes("CANCEL"))
    )
        return "부분 취소";

    if (upper === "PAID") return "결제 완료";
    if (upper === "PROCESSING") return "상품 준비 중";
    if (upper === "SHIPMENT_READY") return "배송 준비";
    if (upper === "SHIPPED") return "배송 중";
    if (upper === "DELIVERED") return "배송 완료";
    if (upper === "CANCELED") return "취소 완료";
    if (upper === "REFUNDED") return "환불 완료";
    if (upper === "RETURNED") return "반품됨";
    if (upper === "PAYMENT_PENDING") return "결제 대기";

    return status;
}

// itemCategory("MD"|"POP"|"MEMBERSHIP") → 탭으로 매핑
function mapCategoryToTab(cat?: string | null): CategoryTab | "UNKNOWN" {
    const c = (cat ?? "").trim().toUpperCase();
    if (c === "MD") return "PRODUCT";
    if (c === "POP") return "PASS";
    if (c === "MEMBERSHIP") return "MEMBERSHIP";
    if (c === "DONATION") return "DONATION";
    if (c === "TICKET") return "TICKET";
    return "UNKNOWN";
}

// ✅ itemCategory가 비어있을 때만 "보수적"으로 카테고리 추정
function inferCategoryFallback(order: SummaryOrderRes): CategoryTab | "UNKNOWN" {
    const name = (order.itemName ?? "").trim().toUpperCase();
    if (!name) return "UNKNOWN";

    if (name.includes("TICKET HOLDER") || name.includes("HOLDER")) return "PRODUCT";
    if (name.includes("POP")) return "PASS";
    if (name.includes("멤버십") || name.includes("MEMBERSHIP")) return "MEMBERSHIP";

    return "PRODUCT";
}

// ✅ “상품명 정보 없음” 대신 자연스러운 기본명
function resolveDisplayBaseName(order: SummaryOrderRes): string {
    const name = (order.itemName ?? "").trim();
    if (name) return name;

    const cat = (order.itemCategory ?? "").trim().toUpperCase();
    if (cat === "MEMBERSHIP") return "멤버십 상품";
    if (cat === "POP") return "POP 이용권";
    if (cat === "MD") return "상품";
    return `상품 (주문 #${order.orderNo})`;
}

export default function MyOrdersPage() {
    const router = useRouter();

    const [categoryTab, setCategoryTab] = useState<CategoryTab>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

    const [allOrders, setAllOrders] = useState<SummaryOrderRes[]>([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(0);
    const size = 10;
    const bigSize = 1000;

    // ✅✅✅ 우회용 썸네일 맵: orderNo -> thumbnailUrl
    const [orderThumbMap, setOrderThumbMap] = useState<Record<number, string>>({});
    const [thumbLoadingOrders, setThumbLoadingOrders] = useState<Set<number>>(new Set());

    // 로그인 체크
    useEffect(() => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        if (!token) {
            alert("로그인이 필요합니다.");
            router.replace("/login");
        }
    }, [router]);

    // 주문 불러오기 (항상 bigSize로 한번에)
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);

                const res = await apiClient.get<PageResult<SummaryOrderRes>>("/order/my_orders", {
                    params: { page: 0, size: bigSize },
                });

                setAllOrders(res.data.content ?? []);
            } catch (e) {
                console.error("[MyOrders] load error", e);
                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    alert("다시 로그인 해주세요.");
                    router.replace("/login");
                } else {
                    alert("주문 내역을 불러오지 못했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [router]);

    // ✅ 최신순 정렬 + 필터
    const visibleOrders = useMemo(() => {
        const sorted = [...(allOrders ?? [])].sort((a, b) => {
            const ta = new Date(a.orderDate).getTime();
            const tb = new Date(b.orderDate).getTime();
            if (Number.isNaN(ta) || Number.isNaN(tb)) return (b.orderNo ?? 0) - (a.orderNo ?? 0);
            return tb - ta;
        });

        return sorted.filter((o) => {
            if (isHiddenStatus(o.orderStatus)) return false;

            const byStatus = statusFilter === "ALL" ? true : isCancelReturnRefund(o.orderStatus);
            if (!byStatus) return false;

            if (categoryTab === "ALL") return true;

            const tabByCat = mapCategoryToTab(o.itemCategory);
            const resolvedTab = tabByCat === "UNKNOWN" ? inferCategoryFallback(o) : tabByCat;

            if (resolvedTab === "UNKNOWN") return false;
            return resolvedTab === categoryTab;
        });
    }, [allOrders, categoryTab, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(visibleOrders.length / size));

    const pagedOrders = useMemo(() => {
        const start = page * size;
        return visibleOrders.slice(start, start + size);
    }, [visibleOrders, page]);

    useEffect(() => {
        setPage(0);
    }, [categoryTab, statusFilter]);

    const showPagination = visibleOrders.length > size;

    // ✅✅✅ 우회 썸네일 로딩:
    // 1) orderNo -> /order/{orderNo}로 itemNo 얻기
    // 2) itemNo -> /item/{itemNo}로 images[0].fileName 얻기
    // 3) orderThumbMap[orderNo]에 저장
    useEffect(() => {
        const loadThumbsForPage = async () => {
            if (!pagedOrders || pagedOrders.length === 0) return;

            const needOrderNos = pagedOrders
                .map((o) => o.orderNo)
                .filter((no) => !orderThumbMap[no] && !thumbLoadingOrders.has(no));

            if (needOrderNos.length === 0) return;

            // 로딩중 표시
            setThumbLoadingOrders((prev) => {
                const next = new Set(prev);
                needOrderNos.forEach((n) => next.add(n));
                return next;
            });

            try {
                const entries = await Promise.all(
                    needOrderNos.map(async (orderNo) => {
                        // 1) 주문 상세에서 itemNo 얻기
                        const od = await apiClient.get<OrderDetailLite>(`/order/${orderNo}`);
                        const orderDetail = od.data;

                        const firstItemNo = orderDetail?.items?.[0]?.itemNo ?? null;

                        // 멤버십만 있는 주문이면(아이템 라인 없음) 썸네일은 없으니 빈값
                        if (!firstItemNo) return [orderNo, ""] as const;

                        // 2) 상품 상세에서 대표 이미지 얻기
                        const it = await apiClient.get<any>(`/item/${firstItemNo}`);
                        const payload: ItemReadOneLite = it.data?.result ?? it.data;

                        const imgs = payload.images ?? [];
                        const sorted = [...imgs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

                        const rawThumb = sorted[0]?.fileName ?? sorted[0]?.url ?? null;
                        const fixed = toImageSrc(rawThumb, `MyOrders#${orderNo}`);

                        return [orderNo, fixed] as const;
                    }),
                );

                setOrderThumbMap((prev) => {
                    const next = { ...prev };
                    for (const [orderNo, url] of entries) {
                        if (url) next[orderNo] = url;
                        else next[orderNo] = ""; // 빈값도 저장(재호출 방지)
                    }
                    return next;
                });
            } catch (e) {
                console.error("[MyOrders] thumb load error", e);
            } finally {
                setThumbLoadingOrders((prev) => {
                    const next = new Set(prev);
                    needOrderNos.forEach((n) => next.delete(n));
                    return next;
                });
            }
        };

        void loadThumbsForPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagedOrders]);

    return (
        <main className="min-h-screen bg-black text-white pt-16">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-6">주문 내역</h1>

                {/* 상단 탭 */}
                <div className="flex gap-4 text-sm md:text-base mb-3 border-b border-zinc-800 pb-2">
                    {(
                        [
                            ["ALL", "전체"],
                            ["PRODUCT", "상품"],
                            ["PASS", "이용권"],
                            ["DONATION", "후원"],
                            ["MEMBERSHIP", "멤버십"],
                            ["TICKET", "티켓"],
                        ] as [CategoryTab, string][]
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setCategoryTab(value)}
                            className={`pb-1 ${
                                categoryTab === value
                                    ? "border-b-2 border-white text-white font-semibold"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* 두 번째 줄 탭 */}
                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setStatusFilter("ALL")}
                        className={`px-4 py-1.5 rounded-full text-xs md:text-sm ${
                            statusFilter === "ALL"
                                ? "bg-white text-black font-semibold"
                                : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                        }`}
                    >
                        전체
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("CANCEL")}
                        className={`px-4 py-1.5 rounded-full text-xs md:text-sm ${
                            statusFilter === "CANCEL"
                                ? "bg-white text-black font-semibold"
                                : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                        }`}
                    >
                        취소/교환/반품
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-sm text-zinc-400">주문 내역을 불러오는 중입니다…</div>
                ) : pagedOrders.length === 0 ? (
                    <div className="py-16 text-center text-sm text-zinc-400">표시할 주문 내역이 없습니다.</div>
                ) : (
                    <>
                        <div className="space-y-8">
                            {pagedOrders.map((order) => {
                                const baseName = resolveDisplayBaseName(order);

                                const count = Number(order.itemCount ?? 0);
                                const safeCount = count > 0 ? count : 1;

                                const displayName = safeCount > 1 ? `${baseName} 외 ${safeCount - 1}건` : baseName;
                                const quantityText = `총 수량 ${safeCount}개`;

                                const cat = (order.itemCategory ?? "").trim().toUpperCase();
                                const badge =
                                    cat === "MD"
                                        ? "상품"
                                        : cat === "POP"
                                            ? "이용권"
                                            : cat === "MEMBERSHIP"
                                                ? "멤버십"
                                                : null;

                                const thumb = orderThumbMap[order.orderNo] || "/icons/t1.png";

                                return (
                                    <section key={order.orderNo} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs md:text-sm text-zinc-400">
                                            <span>{formatDate(order.orderDate)}</span>
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/mypage/orders/${order.orderNo}`)}
                                                className="flex items-center gap-1 hover:text-zinc-200"
                                            >
                                                <span>상세 보기</span>
                                                <span>{">"}</span>
                                            </button>
                                        </div>

                                        <div className="bg-zinc-900 rounded-2xl p-4 md:p-5">
                                            <div className="text-[11px] md:text-xs text-zinc-400 mb-2">{getStatusLabel(order.orderStatus)}</div>

                                            <div className="flex gap-3">
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={thumb}
                                                        alt="thumbnail"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const el = e.currentTarget;
                                                            if (el.src.includes("/icons/t1.png")) return;
                                                            el.src = "/icons/t1.png";
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    {/* ✅ 배지 + 상품명 */}
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {badge && (
                                                            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200">
                                {badge}
                              </span>
                                                        )}
                                                        <div className="text-sm md:text-base font-medium truncate">{displayName}</div>
                                                    </div>

                                                    <div className="mt-1 text-xs md:text-sm text-zinc-400">
                                                        {formatMoney(order.orderTotalPrice)}원 · {quantityText}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        {showPagination && (
                            <div className="mt-8 flex justify-center gap-3 text-xs md:text-sm">
                                <button
                                    type="button"
                                    disabled={page === 0}
                                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                                    className={`px-3 py-1.5 rounded-full border ${
                                        page === 0
                                            ? "border-zinc-700 text-zinc-600 cursor-default"
                                            : "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                                    }`}
                                >
                                    이전
                                </button>
                                <span className="text-zinc-400">
                  {page + 1} / {totalPages}
                </span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                                    className={`px-3 py-1.5 rounded-full border ${
                                        page >= totalPages - 1
                                            ? "border-zinc-700 text-zinc-600 cursor-default"
                                            : "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                                    }`}
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
