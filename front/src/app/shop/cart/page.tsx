// src/app/shop/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { AxiosError } from "axios";

// ===== 공통 타입 =====
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface CartItem {
    cartNo: number;
    itemNo: number;
    itemName: string;
    thumbnail: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    membershipOnly: boolean;
    soldOut: boolean;
    optionLabel: string | null;
}

// ✅ API_BASE
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// ✅ 브라우저 안전 base64 decode (Buffer 쓰지 말기)
function decodeJwtPayload(token: string): any | null {
    try {
        const base64Url = token.split(".")[1];
        if (!base64Url) return null;

        // base64url -> base64
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

// ===== JWT 에서 이메일 꺼내기 유틸 =====
function getMemberEmailFromToken(): string | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    return (payload?.sub as string) ?? null;
}

// ===== Authorization 헤더 유틸 =====
function getAuthHeaders() {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

// ✅ 장바구니 썸네일 URL 정규화
function toCartThumbSrc(raw?: string | null): string {
    if (!raw) return "/images/placeholder.png";

    const url = raw.trim();
    if (!url) return "/images/placeholder.png";

    // 절대 URL이면 그대로
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    // /files 로 시작하면 백엔드 붙이기 (한글 포함 안전하게 encodeURI)
    if (url.startsWith("/files")) return encodeURI(`${API_BASE}${url}`);

    // 그 외 상대경로면 그대로
    return encodeURI(url.startsWith("/") ? url : `/${url}`);
}

export default function CartPage() {
    const router = useRouter();

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showLoginRequired, setShowLoginRequired] = useState(false);

    // 선택된 cartNo 목록 (체크박스)
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // 모달들
    const [shippingInfoOpen, setShippingInfoOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null);

    // ====== 장바구니 불러오기 ======
    useEffect(() => {
        const loadCart = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                if (typeof window === "undefined") return;

                const token = localStorage.getItem("accessToken");
                if (!token) {
                    setShowLoginRequired(true);
                    setItems([]);
                    return;
                }

                const res = await apiClient.get<ApiResult<CartItem[]>>("/cart", {
                    headers: getAuthHeaders(),
                });

                if (!res.data.isSuccess) {
                    setErrorMsg(res.data.resMessage ?? "장바구니 정보를 불러오지 못했습니다.");
                    setItems([]);
                    return;
                }

                const list = res.data.result ?? [];
                setItems(list);

                // 기본은 전부 선택
                setSelectedIds(list.map((it) => it.cartNo));
            } catch (e) {
                const err = e as AxiosError;
                console.error("[loadCart] 장바구니 조회 실패", err);

                if (err.response?.status === 401) {
                    setShowLoginRequired(true);
                    setItems([]);
                } else {
                    setErrorMsg("장바구니 정보를 불러오지 못했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        loadCart();
    }, []);

    // ====== 선택/합계 계산 ======
    const allSelected = items.length > 0 && selectedIds.length === items.length;

    const toggleAll = () => {
        if (allSelected) setSelectedIds([]);
        else setSelectedIds(items.map((it) => it.cartNo));
    };

    const toggleOne = (cartNo: number) => {
        setSelectedIds((prev) =>
            prev.includes(cartNo) ? prev.filter((id) => id !== cartNo) : [...prev, cartNo]
        );
    };

    const { totalQuantity, totalAmount } = useMemo(() => {
        const selected = items.filter((it) => selectedIds.includes(it.cartNo));
        const qty = selected.reduce((sum, it) => sum + it.quantity, 0);
        const amt = selected.reduce((sum, it) => sum + it.lineTotal, 0);
        return { totalQuantity: qty, totalAmount: amt };
    }, [items, selectedIds]);

    // ====== 수량 변경 ======
    const updateQuantity = async (item: CartItem, delta: number) => {
        const memberEmail = getMemberEmailFromToken();
        if (!memberEmail) {
            setShowLoginRequired(true);
            return;
        }

        const nextQty = item.quantity + delta;
        if (nextQty < 1) return;

        try {
            // optimistic 업데이트
            setItems((prev) =>
                prev.map((it) =>
                    it.cartNo === item.cartNo
                        ? { ...it, quantity: nextQty, lineTotal: it.unitPrice * nextQty }
                        : it
                )
            );

            await apiClient.put(
                `/cart/${encodeURIComponent(memberEmail)}/items/${item.cartNo}`,
                { quantity: nextQty },
                { headers: getAuthHeaders() }
            );
        } catch (e) {
            console.error("[updateQuantity] 실패, 롤백", e);
            window.location.reload();
        }
    };

    // ====== 삭제 ======
    const confirmDelete = (item: CartItem) => setDeleteTarget(item);

    const doDelete = async () => {
        if (!deleteTarget) return;

        const memberEmail = getMemberEmailFromToken();
        if (!memberEmail) {
            setShowLoginRequired(true);
            return;
        }

        try {
            await apiClient.delete(
                `/cart/${encodeURIComponent(memberEmail)}/items/${deleteTarget.cartNo}`,
                { headers: getAuthHeaders() }
            );

            setItems((prev) => prev.filter((it) => it.cartNo !== deleteTarget.cartNo));
            setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.cartNo));
            setDeleteTarget(null);
        } catch (e) {
            console.error("[doDelete] 장바구니 삭제 실패", e);
            alert("상품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // ====== 구매하기 → /order/goods/checkout 으로 이동 ======
    const handleCheckout = () => {
        if (selectedIds.length === 0) {
            alert("구매할 상품을 선택해주세요.");
            return;
        }
        const query = `cartNos=${selectedIds.join(",")}`;
        router.push(`/order/goods/checkout?${query}`);
    };

    // ====== 화면 분기 ======
    if (showLoginRequired) {
        return (
            <div className="min-h-screen bg-black text-white pt-24 flex items-center justify-center">
                <div className="text-center">
                    <p className="mb-4 text-sm text-zinc-300">장바구니 정보를 불러오지 못했습니다.</p>
                    <button
                        type="button"
                        onClick={() => router.push("/login")}
                        className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold hover:bg-red-500"
                    >
                        로그인 하러 가기
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white pt-24 flex items-center justify-center">
                로딩 중...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text:white">
            <main className="mx-auto mt-[112px] flex max-w-4xl flex-col px-6 pb-24">
                <h1 className="text-xl font-semibold mb-6">장바구니</h1>

                {errorMsg && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                        {errorMsg}
                    </div>
                )}

                <div className="mb-4 flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-zinc-200">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-3 w-3 rounded-sm border border-zinc-500 bg-black accent-red-600"
                        />
                        <span>함께 배송</span>
                    </label>

                    <button
                        type="button"
                        className="text-[11px] text-sky-400 hover:underline"
                        onClick={() => setShippingInfoOpen(true)}
                    >
                        배송비 정보 &gt;
                    </button>
                </div>

                <section className="space-y-6">
                    {items.map((item) => (
                        <div key={item.cartNo} className="flex gap-4 border-b border-zinc-800 pb-10">
                            {/* 체크박스 */}
                            <div className="pt-3">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.cartNo)}
                                    onChange={() => toggleOne(item.cartNo)}
                                    className="h-3 w-3 rounded-sm border border-zinc-500 bg-black accent-red-600"
                                />
                            </div>

                            {/* 왼쪽: 썸네일 + 수량 */}
                            <div className="flex w-32 flex-col gap-2">
                                {/* ✅ 썸네일: next/image 대신 img (백엔드 /files + 한글 파일명 안전) */}
                                <div className="relative h-24 w-24 overflow-hidden rounded-md bg-zinc-900">
                                    <img
                                        src={toCartThumbSrc(item.thumbnail)}
                                        alt={item.itemName}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = "/images/placeholder.png";
                                        }}
                                    />
                                </div>

                                <div className="mt-1 inline-flex h-8 w-[110px] items-center justify-between rounded-full border border-zinc-700 bg-black">
                                    <button
                                        type="button"
                                        className="flex h-full w-8 items-center justify-center text-xs text-zinc-300 hover:bg-zinc-800"
                                        onClick={() => updateQuantity(item, -1)}
                                    >
                                        -
                                    </button>
                                    <span className="text-xs text-white">{item.quantity}</span>
                                    <button
                                        type="button"
                                        className="flex h-full w-8 items-center justify-center text-xs text-zinc-300 hover:bg-zinc-800"
                                        onClick={() => updateQuantity(item, +1)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* 오른쪽 */}
                            <div className="flex flex-1 flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-zinc-100 leading-tight">
                                            {item.itemName}
                                        </p>
                                        {item.optionLabel && (
                                            <p className="text-xs text-zinc-400">{item.optionLabel}</p>
                                        )}
                                        {item.soldOut && <p className="text-[11px] text-red-400">품절</p>}
                                    </div>

                                    <button
                                        type="button"
                                        className="text-lg text-zinc-500 hover:text-zinc-200"
                                        onClick={() => confirmDelete(item)}
                                        aria-label="장바구니에서 삭제"
                                    >
                                        ×
                                    </button>
                                </div>

                                {item.membershipOnly && (
                                    <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-red-500 whitespace-nowrap">
                      멤버십 가입 후 구매할 수 있는 상품이에요.
                    </span>

                                        <button
                                            type="button"
                                            onClick={() => router.push("/membership/all")}
                                            className="text-[11px] font-semibold text-red-300 hover:text-red-200"
                                        >
                                            가입하기 &gt;
                                        </button>
                                    </div>
                                )}

                                <div className="mt-3 flex justify-end">
                                    <p className="text-sm font-semibold">
                                        {item.lineTotal.toLocaleString("ko-KR")}원
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <p className="py-16 text-center text-sm text-zinc-400">
                            장바구니에 담긴 상품이 없습니다.
                        </p>
                    )}
                </section>

                <section className="mt-10 pt-4 text-xs text-zinc-300">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <span className="font-semibold text-white">{totalQuantity}개</span>
                            <span className="ml-1 text-zinc-400"> (배송비 미포함)</span>
                        </div>
                        <div className="text-right text-sm font-semibold">
                            {totalAmount.toLocaleString("ko-KR")}원
                        </div>
                    </div>

                    <ul className="space-y-1 text-[11px] text-zinc-500">
                        <li>장바구니에는 최대 50개의 상품을 보관할 수 있습니다.</li>
                        <li>최초 장바구니에 담은 상품 정보와 현재 상품 정보는 다를 수 있습니다.</li>
                        <li>상품의 종류와 관계 없이 한 번에 최대 50개까지 구매할 수 있습니다.</li>
                    </ul>

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={handleCheckout}
                            className="rounded-md bg-red-600 px-10 py-3 text-sm font-semibold text-white hover:bg-red-500"
                        >
                            구매하기
                        </button>
                    </div>
                </section>
            </main>

            {/* ===== 삭제 확인 모달 ===== */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-5 text-sm text-zinc-100">
                        <p className="mb-6 text-center">이 상품을 장바구니에서 삭제할까요?</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 rounded-xl bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-600"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={doDelete}
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== 배송비 정보 모달 ===== */}
            {shippingInfoOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-5 text-sm text-zinc-100">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-semibold">배송비 정보</span>
                            <button
                                type="button"
                                onClick={() => setShippingInfoOpen(false)}
                                className="text-lg text-zinc-400 hover:text-zinc-200"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-5 text-[13px] text-zinc-200">
                            <div>
                                <p className="font-semibold text-white">국내 배송</p>
                                <p className="mt-1 text-zinc-300">
                                    CJ대한통운 / 기본 3,000원, 도서산간 6,000원 (50,000원 이상 구매 시 무료 배송)
                                </p>
                                <p className="mt-2 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[11px] text-zinc-300">
                                    출고 이후 3영업일 소요 예상
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold text-white">해외 배송</p>
                                <p className="mt-1 text-zinc-300">
                                    DHL / 배송 국가 및 무게에 따라 배송비가 책정됩니다.
                                </p>
                                <p className="mt-2 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[11px] text-zinc-300">
                                    출고 이후 5영업일 이상 소요 예상
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
