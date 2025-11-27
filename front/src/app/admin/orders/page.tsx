// src/app/admin/order/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

type OrderStatus =
    | "PENDING"
    | "PAID"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELED"
    | "REFUNDED";

interface PageResult<T> {
    content: T[];
    number: number;
    size: number;
    totalPages: number;
    totalElements: number;
}

interface SummaryOrderRes {
    orderNo: number;
    memberEmail: string;
    orderDate: string;
    orderTotalPrice: number;
    orderStatus: OrderStatus;
    itemCount: number;
    itemName: string | null;
}

interface ErrorBody {
    resMessage?: string;
    message?: string;
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

const formatDateTime = (t: string) =>
    new Date(t).toLocaleString("ko-KR");
const formatPrice = (n: number) =>
    `${n.toLocaleString("ko-KR")}원`;

export default function AdminOrderListPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<SummaryOrderRes[]>([]);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 검색/필터 (프론트 전용)
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<OrderStatus | "ALL">("ALL");

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            const res = await apiClient.get<PageResult<SummaryOrderRes>>(
                "/admin/order",
                {
                    params: { page, size },
                }
            );

            const data = res.data;
            setOrders(data.content);
            setPage(data.number);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
        } catch (err) {
            console.error(err);
            let msg = "주문 목록을 불러오지 못했습니다.";
            if (axios.isAxiosError<ErrorBody>(err)) {
                const ax = err as AxiosError<ErrorBody>;
                msg =
                    ax.response?.data?.resMessage ||
                    ax.response?.data?.message ||
                    msg;
            }
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, size]);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            if (
                statusFilter !== "ALL" &&
                o.orderStatus !== statusFilter
            ) {
                return false;
            }

            if (!searchText.trim()) return true;

            const keyword = searchText.trim().toLowerCase();
            return (
                String(o.orderNo).includes(keyword) ||
                o.memberEmail.toLowerCase().includes(keyword) ||
                (o.itemName ?? "")
                    .toLowerCase()
                    .includes(keyword)
            );
        });
    }, [orders, statusFilter, searchText]);

    const resetFilter = () => {
        setSearchText("");
        setStatusFilter("ALL");
    };

    return (
        <div className="w-full h-full bg-black text-white px-10 py-8 flex flex-col gap-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        주문 관리
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        전체 주문{" "}
                        <span className="text-red-500 font-semibold">
                            {totalElements.toLocaleString("ko-KR")}
                        </span>
                        건
                    </p>
                </div>
            </div>

            {/* 검색/필터 바 */}
            <section className="bg-[#111] border border-neutral-800 rounded-2xl px-4 py-3 flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* 검색 인풋 */}
                    <div className="flex-1 min-w-[260px]">
                        <input
                            className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-2 text-sm placeholder:text-neutral-500"
                            placeholder="이메일 / 주문번호 / 상품명으로 검색"
                            value={searchText}
                            onChange={(e) =>
                                setSearchText(e.target.value)
                            }
                        />
                    </div>

                    {/* 상태 필터 */}
                    <div className="flex items-center gap-2">
                        <select
                            className="bg-black border border-neutral-700 rounded-xl px-3 py-2 text-xs"
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(
                                    e.target.value as
                                        | OrderStatus
                                        | "ALL"
                                )
                            }
                        >
                            <option value="ALL">전체 상태</option>
                            <option value="PENDING">결제대기</option>
                            <option value="PAID">결제완료</option>
                            <option value="SHIPPED">배송중</option>
                            <option value="DELIVERED">
                                배송완료
                            </option>
                            <option value="CANCELED">취소</option>
                            <option value="REFUNDED">
                                환불완료
                            </option>
                        </select>

                        <button
                            className="px-3 py-2 text-xs border border-neutral-600 rounded-xl hover:bg-neutral-800"
                            onClick={resetFilter}
                        >
                            초기화
                        </button>
                    </div>
                </div>
            </section>

            {/* 테이블 */}
            <section className="bg-[#111] border border-neutral-800 rounded-2xl overflow-hidden flex-1 flex flex-col">
                <div className="px-4 py-2 border-b border-neutral-800 flex justify-between items-center text-xs text-neutral-400">
                    <span>
                        주문 목록 (현재 페이지{" "}
                        {page + 1} / {Math.max(totalPages, 1)})
                    </span>
                    {loading && <span>불러오는 중…</span>}
                </div>

                {errorMsg && (
                    <div className="px-4 py-2 text-xs text-red-400 border-b border-neutral-800">
                        {errorMsg}
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-black border-b border-neutral-800">
                        <tr className="text-neutral-400">
                            <th className="px-4 py-2 text-left">
                                주문번호
                            </th>
                            <th className="px-4 py-2 text-left">
                                주문시각
                            </th>
                            <th className="px-4 py-2 text-left">
                                이메일
                            </th>
                            <th className="px-4 py-2 text-left">
                                대표 상품
                            </th>
                            <th className="px-4 py-2 text-right">
                                결제 금액
                            </th>
                            <th className="px-4 py-2 text-center">
                                상태
                            </th>
                            <th className="px-4 py-2 text-center">
                                관리
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredOrders.length === 0 &&
                            !loading && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-6 text-center text-neutral-500"
                                    >
                                        주문이 없습니다.
                                    </td>
                                </tr>
                            )}

                        {filteredOrders.map((o) => (
                            <tr
                                key={o.orderNo}
                                className="border-b border-neutral-900 hover:bg-neutral-900/60"
                            >
                                <td className="px-4 py-2">
                                    {o.orderNo}
                                </td>
                                <td className="px-4 py-2 text-neutral-300">
                                    {formatDateTime(o.orderDate)}
                                </td>
                                <td className="px-4 py-2 text-neutral-300">
                                    {o.memberEmail}
                                </td>
                                <td className="px-4 py-2 text-neutral-300">
                                    {o.itemName ?? "-"}
                                    {o.itemCount > 1 && (
                                        <span className="text-neutral-500">
                                                {" "}
                                            외{" "}
                                            {o.itemCount - 1}
                                            개
                                            </span>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-right text-neutral-100">
                                    {formatPrice(
                                        o.orderTotalPrice
                                    )}
                                </td>
                                <td className="px-4 py-2 text-center">
                                        <span className="px-2 py-1 rounded-full text-[11px] bg-neutral-900 text-white">
                                            {statusLabel(
                                                o.orderStatus
                                            )}
                                        </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button
                                        className="px-3 py-1 text-[11px] border border-neutral-600 rounded-2xl hover:bg-neutral-800"
                                        onClick={() =>
                                            router.push(
                                                `/admin/order/${o.orderNo}`
                                            )
                                        }
                                    >
                                        상세 보기
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* 페이징 */}
                <div className="px-4 py-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                    <div className="flex items-center gap-2">
                        <button
                            className="px-2 py-1 border border-neutral-700 rounded disabled:opacity-40"
                            disabled={page <= 0}
                            onClick={() =>
                                setPage((prev) =>
                                    Math.max(prev - 1, 0)
                                )
                            }
                        >
                            이전
                        </button>
                        <span>
                            {page + 1} /{" "}
                            {Math.max(totalPages, 1)}
                        </span>
                        <button
                            className="px-2 py-1 border border-neutral-700 rounded disabled:opacity-40"
                            disabled={page + 1 >= totalPages}
                            onClick={() =>
                                setPage((prev) =>
                                    Math.min(
                                        prev + 1,
                                        totalPages - 1
                                    )
                                )
                            }
                        >
                            다음
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <span>페이지당</span>
                        <select
                            className="bg-black border border-neutral-700 rounded px-2 py-1"
                            value={size}
                            onChange={(e) => {
                                setSize(
                                    Number(e.target.value)
                                );
                                setPage(0);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
            </section>
        </div>
    );
}
