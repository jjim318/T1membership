// src/app/shop/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

// ===== 공통 타입 =====
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 백엔드 CartItemRes 에 맞춘 타입 정의
interface CartItem {
    cartNo: number;
    itemNo: number;
    itemName: string;
    thumbnail: string | null;

    quantity: number;
    unitPrice: number;
    lineTotal: number;

    membershipOnly: boolean;
    soldOut: boolean;

    optionLabel: string | null;
}

// ===== JWT 에서 이메일 꺼내기 (브라우저용 atob) =====
function getMemberEmailFromToken(): string | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
        const base64 = token.split(".")[1];
        if (!base64) return null;

        const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(normalized);
        const payload = JSON.parse(json);

        return (payload.sub as string) ?? null;
    } catch (e) {
        console.error("[getMemberEmailFromToken] 파싱 실패", e);
        return null;
    }
}

export default function CartPage() {
    const router = useRouter();

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showLoginRequired, setShowLoginRequired] = useState(false);

    // 체크된 cartNo 목록
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // 모달
    const [shippingInfoOpen, setShippingInfoOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null);

    // ===== 장바구니 불러오기 =====
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

                const res = await apiClient.get<ApiResult<CartItem[]>>("/cart");

                if (!res.data.isSuccess) {
                    setErrorMsg(
                        res.data.resMessage ?? "장바구니 정보를 불러오지 못했습니다.",
                    );
                    setItems([]);
                    return;
                }

                const list = res.data.result ?? [];
                setItems(list);
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

    // ===== 선택 / 합계 =====
    const allSelected =
        items.length > 0 && selectedIds.length === items.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map((it) => it.cartNo));
        }
    };

    const toggleOne = (cartNo: number) => {
        setSelectedIds((prev) =>
            prev.includes(cartNo)
                ? prev.filter((id) => id !== cartNo)
                : [...prev, cartNo],
        );
    };

    const { totalQuantity, totalAmount } = useMemo(() => {
        const selected = items.filter((it) => selectedIds.includes(it.cartNo));
        const qty = selected.reduce((sum, it) => sum + it.quantity, 0);
        const amt = selected.reduce((sum, it) => sum + it.lineTotal, 0);
        return { totalQuantity: qty, totalAmount: amt };
    }, [items, selectedIds]);

    // ===== 수량 변경 (itemNo 사용) =====
    const updateQuantity = async (item: CartItem, delta: number) => {
        const memberEmail = getMemberEmailFromToken();
        if (!memberEmail) {
            setShowLoginRequired(true);
            return;
        }

        const nextQty = item.quantity + delta;
        if (nextQty < 1) return;
        if (item.soldOut) return;

        try {
            await apiClient.put(
                `/cart/${encodeURIComponent(memberEmail)}/items/${item.itemNo}`,
                { quantity: nextQty },
            );

            setItems((prev) =>
                prev.map((it) =>
                    it.cartNo === item.cartNo
                        ? {
                            ...it,
                            quantity: nextQty,
                            lineTotal: it.unitPrice * nextQty,
                        }
                        : it,
                ),
            );
        } catch (e) {
            console.error("[updateQuantity] 실패", e);
            alert("수량 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // ===== 삭제 (cartNo 사용) =====
    const confirmDelete = (item: CartItem) => {
        setDeleteTarget(item);
    };

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
            );

            setItems((prev) =>
                prev.filter((it) => it.cartNo !== deleteTarget.cartNo),
            );
            setSelectedIds((prev) =>
                prev.filter((id) => id !== deleteTarget.cartNo),
            );
            setDeleteTarget(null);
        } catch (e) {
            console.error("[doDelete] 장바구니 삭제 실패", e);
            alert("상품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // ===== 구매하기 (추후 주문 연동) =====
    const handleCheckout = () => {
        if (selectedIds.length === 0) {
            alert("구매할 상품을 선택해주세요.");
            return;
        }
        alert("나중에 주문 페이지와 연동할 예정입니다.");
    };

    // ===== 화면 분기 =====
    if (showLoginRequired) {
        return (
            <div className="min-h-screen bg-black text-white pt-24 flex items-center justify-center">
                <div className="text-center">
                    <p className="mb-4 text-sm text-zinc-300">
                        장바구니 정보를 불러오지 못했습니다.
                    </p>
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
        <div className="min-h-screen bg-black text-white">
            <main className="mx-auto mt-[112px] flex max-w-4xl flex-col px-6 pb-24">
                {/* 제목 */}
                <h1 className="mb-6 text-2xl font-semibold">장바구니</h1>

                {/* 상단: 함께배송 + 배송비 정보 */}
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

                {/* 상품 리스트 */}
                <section className="space-y-6">
                    {items.map((item) => {
                        const isMembershipItem = item.membershipOnly;
                        const isSoldOut = item.soldOut;

                        // 🔥 썸네일 null / 빈 문자열 대비
                        const thumbnailSrc =
                            item.thumbnail && item.thumbnail.length > 0
                                ? (item.thumbnail.startsWith("http") ||
                                item.thumbnail.startsWith("/")
                                    ? item.thumbnail
                                    : `/${item.thumbnail}`)
                                : "/icons/cart.png"; // 썸네일 없을 때 기본 이미지

                        return (
                            <div
                                key={item.cartNo}
                                className="flex gap-4 border-b border-zinc-800 pb-10"
                            >
                                {/* 체크박스 */}
                                <div className="pt-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(item.cartNo)}
                                        onChange={() => toggleOne(item.cartNo)}
                                        className="h-3 w-3 rounded-sm border border-zinc-500 bg-black accent-red-600"
                                    />
                                </div>

                                {/* 오른쪽 전체 영역 */}
                                <div className="flex-1">
                                    {/* 1행: 썸네일 + 상품 정보/금액 */}
                                    <div className="flex gap-4">
                                        {/* 썸네일 + 수량 박스 */}
                                        <div className="flex flex-col items-start">
                                            <div className="relative h-24 w-24 overflow-hidden rounded-md bg-zinc-900">
                                                <Image
                                                    src={thumbnailSrc}
                                                    alt={item.itemName}
                                                    fill
                                                    sizes="96px"
                                                    className="object-cover"
                                                />
                                            </div>

                                            {/* 수량 박스 */}
                                            <div
                                                className={`mt-3 inline-flex h-8 w-[110px] items-center justify-between rounded-full border border-zinc-700 bg-black ${
                                                    isSoldOut ? "opacity-40" : ""
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    className={`flex h-full w-8 items-center justify-center text-xs text-zinc-300 ${
                                                        isSoldOut
                                                            ? "cursor-not-allowed"
                                                            : "hover:bg-zinc-800"
                                                    }`}
                                                    onClick={() =>
                                                        !isSoldOut &&
                                                        updateQuantity(item, -1)
                                                    }
                                                >
                                                    -
                                                </button>
                                                <span
                                                    className={`text-xs ${
                                                        isSoldOut
                                                            ? "text-zinc-400"
                                                            : "text-white"
                                                    }`}
                                                >
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    className={`flex h-full w-8 items-center justify-center text-xs text-zinc-300 ${
                                                        isSoldOut
                                                            ? "cursor-not-allowed"
                                                            : "hover:bg-zinc-800"
                                                    }`}
                                                    onClick={() =>
                                                        !isSoldOut &&
                                                        updateQuantity(item, +1)
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* 상품 정보 / 금액 */}
                                        <div className="flex flex-1 flex-col justify-between">
                                            <div>
                                                {/* 상품명 + 옵션 + X 버튼 */}
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold leading-tight text-zinc-100">
                                                            {item.itemName}
                                                        </p>

                                                        {/* 옵션 라벨 (예: Red / L, FAKER 등) */}
                                                        {item.optionLabel && (
                                                            <p className="mt-1 text-xs text-zinc-400">
                                                                {item.optionLabel}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="text-lg text-zinc-500 hover:text-zinc-200"
                                                        onClick={() =>
                                                            confirmDelete(item)
                                                        }
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 금액 */}
                                            <div className="mt-3 flex justify-end">
                                                <p
                                                    className={`text-sm font-semibold ${
                                                        isSoldOut
                                                            ? "text-zinc-500"
                                                            : "text-white"
                                                    }`}
                                                >
                                                    {item.lineTotal.toLocaleString(
                                                        "ko-KR",
                                                    )}
                                                    원
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2행: 안내 문구 (상품 아래 줄) */}
                                    {isSoldOut && (
                                        <div className="mt-3 flex items-center text-[11px] text-red-500">
                                            <span className="mr-1 text-base">!</span>
                                            <span>선택한 옵션이 품절되었어요.</span>
                                        </div>
                                    )}

                                    {!isSoldOut && isMembershipItem && (
                                        <div className="mt-3 flex items-center justify-between text-[11px]">
                                            <div className="flex items-center text-red-500">
                                                <span className="mr-1 text-base">!</span>
                                                <span>
                                                    멤버십 가입 후 구매할 수 있는 상품이에요.
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push("/membership/join")
                                                }
                                                className="text-[11px] font-semibold text-red-300 hover:text-red-200"
                                            >
                                                가입하기 &gt;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* 하단 요약 & 버튼 */}
                <section className="mt-10 pt-4 text-xs text-zinc-300">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <span className="font-semibold text-white">
                                {totalQuantity}개
                            </span>
                            <span className="ml-1 text-zinc-400">
                                {" "}
                                (배송비 미포함)
                            </span>
                        </div>
                        <div className="text-right text-sm font-semibold">
                            {totalAmount.toLocaleString("ko-KR")}원
                        </div>
                    </div>

                    <ul className="space-y-1 text-[11px] text-zinc-500">
                        <li>
                            장바구니에는 최대 50개의 상품을 보관할 수 있습니다.
                        </li>
                        <li>
                            최초 장바구니에 담은 상품 정보와 현재 상품 정보는 다를 수
                            있습니다.
                        </li>
                        <li>
                            상품의 종류와 관계 없이 한 번에 최대 50개까지 구매할 수
                            있습니다.
                        </li>
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

            {/* 삭제 확인 모달 */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-5 text-sm text-zinc-100">
                        <p className="mb-6 text-center">
                            이 상품을 장바구니에서 삭제할까요?
                        </p>
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

            {/* 배송비 정보 모달 */}
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
                                    CJ대한통운 / 기본 3,000원, 도서산간 6,000원 (50,000원 이상
                                    구매 시 무료 배송)
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
