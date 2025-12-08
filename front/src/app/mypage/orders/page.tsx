// src/app/mypage/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/apiClient";

// 🔥 서버 SummaryOrderRes 그대로 맞춘 타입
interface SummaryOrderRes {
    orderNo: number;          // 주문번호
    memberEmail: string;      // 주문 회원 이메일
    orderDate: string;        // 주문시각 (LocalDateTime → ISO 문자열)
    orderTotalPrice: number;  // 총 결제 금액
    orderStatus: string;      // 주문 상태 (enum 문자열)
    itemCount: number;        // 상품 개수
    itemName: string | null;  // 대표 상품 이름
}

// Spring Data Page
interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

// 상단 카테고리 탭 (전체 / 상품 / 이용권 / 후원 / 멤버십 / 티켓)
type CategoryTab = "ALL" | "PRODUCT" | "PASS" | "DONATION" | "MEMBERSHIP" | "TICKET";

// 두 번째 줄 탭 (전체 / 취소·교환·반품)
type StatusFilter = "ALL" | "CANCEL";

// =====================
//   헬퍼 함수
// =====================

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}.${m}.${day}`;
}

function formatMoney(value: number): string {
    return value.toLocaleString("ko-KR");
}

// 상태 한글 라벨
function getStatusLabel(status: string): string {
    const upper = status.toUpperCase();
    if (upper.includes("PENDING") || upper.includes("WAIT")) return "결제 대기";
    if (upper.includes("PAID") || upper.includes("PAY_COMPLETE")) return "구매확정";
    if (upper.includes("SHIP") || upper.includes("DELIVERY")) return "배송 중";
    if (upper.includes("DELIVERED") || upper.includes("DELIVERY_COMPLETE")) return "배송 완료";
    if (upper.includes("CANCEL")) return "취소 완료";
    if (upper.includes("REFUND")) return "환불 완료";
    return status;
}

// 취소/환불 계열인지
function isCanceledStatus(status: string): boolean {
    const upper = status.toUpperCase();
    return upper.includes("CANCEL") || upper.includes("REFUND");
}

export default function MyOrdersPage() {
    const router = useRouter();

    const [categoryTab, setCategoryTab] = useState<CategoryTab>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [pageData, setPageData] = useState<PageResult<SummaryOrderRes> | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const size = 10;

    // 로그인 체크
    useEffect(() => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        if (!token) {
            alert("로그인이 필요합니다.");
            router.replace("/login");
        }
    }, [router]);

    // 주문 목록 불러오기
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);

                const res = await apiClient.get<PageResult<SummaryOrderRes>>(
                    "/order/my_orders",
                    {
                        params: { page, size },
                    },
                );

                setPageData(res.data);
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
    }, [page, router]);

    // 필터 적용된 주문 목록
    const filteredOrders = useMemo(() => {
        if (!pageData) return [];

        return pageData.content.filter((o) => {
            // 🔥 현재는 카테고리 정보가 없으니까 categoryTab은 ALL만 쓰고,
            //   나중에 OrderEntity/DTO에 type 붙이면 여기서 필터 로직 추가
            const byCategory = categoryTab === "ALL";

            const byStatus =
                statusFilter === "ALL"
                    ? true
                    : isCanceledStatus(o.orderStatus);

            return byCategory && byStatus;
        });
    }, [pageData, categoryTab, statusFilter]);

    const totalPages = pageData?.totalPages ?? 0;

    // =====================
    //   렌더링
    // =====================

    return (
        <main className="min-h-screen bg-black text-white pt-16">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                {/* 제목 */}
                <h1 className="text-2xl md:text-3xl font-bold mb-6">주문 내역</h1>

                {/* 상단 탭 (전체 / 상품 / 이용권 / 후원 / 멤버십 / 티켓) */}
                <div className="flex gap-4 text-sm md:text-base mb-3 border-b border-zinc-800 pb-2">
                    {([
                        ["ALL", "전체"],
                        ["PRODUCT", "상품"],
                        ["PASS", "이용권"],
                        ["DONATION", "후원"],
                        ["MEMBERSHIP", "멤버십"],
                        ["TICKET", "티켓"],
                    ] as [CategoryTab, string][]).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setCategoryTab(value)}
                            className={`
                                pb-1
                                ${
                                categoryTab === value
                                    ? "border-b-2 border-white text-white font-semibold"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }
                            `}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* 두 번째 줄 탭 (전체 / 취소·교환·반품) */}
                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setStatusFilter("ALL")}
                        className={`
                            px-4 py-1.5 rounded-full text-xs md:text-sm
                            ${
                            statusFilter === "ALL"
                                ? "bg-white text-black font-semibold"
                                : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                        }
                        `}
                    >
                        전체
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("CANCEL")}
                        className={`
                            px-4 py-1.5 rounded-full text-xs md:text-sm
                            ${
                            statusFilter === "CANCEL"
                                ? "bg-white text-black font-semibold"
                                : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                        }
                        `}
                    >
                        취소/교환/반품
                    </button>
                </div>

                {/* 본문: 주문 리스트 */}
                {loading ? (
                    <div className="py-16 text-center text-sm text-zinc-400">
                        주문 내역을 불러오는 중입니다…
                    </div>
                ) : !pageData || filteredOrders.length === 0 ? (
                    <div className="py-16 text-center text-sm text-zinc-400">
                        주문 내역이 없습니다.
                    </div>
                ) : (
                    <>
                        {/* 각 주문 블록 – T1.fan 구조 비슷하게 */}
                        <div className="space-y-8">
                            {filteredOrders.map((order) => (
                                <section key={order.orderNo} className="space-y-2">
                                    {/* 날짜 + 상세 보기 */}
                                    <div className="flex items-center justify-between text-xs md:text-sm text-zinc-400">
                                        <span>{formatDate(order.orderDate)}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(
                                                    `/mypage/orders/${order.orderNo}`,
                                                )
                                            }
                                            className="flex items-center gap-1 hover:text-zinc-200"
                                        >
                                            <span>상세 보기</span>
                                            <span>{">"}</span>
                                        </button>
                                    </div>

                                    {/* 주문 카드 */}
                                    <div className="bg-zinc-900 rounded-2xl p-4 md:p-5">
                                        {/* 상태 라벨 */}
                                        <div className="text-[11px] md:text-xs text-zinc-400 mb-2">
                                            {getStatusLabel(order.orderStatus)}
                                        </div>

                                        {/* 내용: 썸네일 + 상품명 + 금액/개수 */}
                                        <div className="flex gap-3">
                                            {/* 썸네일 – 지금은 기본 T1 로고, 나중에 이미지 필드 생기면 교체 */}
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src="/icons/t1.png"
                                                    alt="T1"
                                                    className="w-10 h-10 opacity-80"
                                                />
                                            </div>

                                            {/* 텍스트 영역 */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="text-sm md:text-base font-medium truncate">
                                                    {order.itemName ?? "상품명 정보 없음"}
                                                </div>
                                                <div className="mt-1 text-xs md:text-sm text-zinc-400">
                                                    {formatMoney(order.orderTotalPrice)}원 ·{" "}
                                                    {order.itemCount}개
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center gap-3 text-xs md:text-sm">
                                <button
                                    type="button"
                                    disabled={page === 0}
                                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                                    className={`
                                        px-3 py-1.5 rounded-full border
                                        ${
                                        page === 0
                                            ? "border-zinc-700 text-zinc-600 cursor-default"
                                            : "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                                    }
                                    `}
                                >
                                    이전
                                </button>
                                <span className="text-zinc-400">
                                    {page + 1} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages - 1}
                                    onClick={() =>
                                        setPage((p) =>
                                            totalPages === 0
                                                ? p
                                                : Math.min(p + 1, totalPages - 1),
                                        )
                                    }
                                    className={`
                                        px-3 py-1.5 rounded-full border
                                        ${
                                        page >= totalPages - 1
                                            ? "border-zinc-700 text-zinc-600 cursor-default"
                                            : "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                                    }
                                    `}
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
