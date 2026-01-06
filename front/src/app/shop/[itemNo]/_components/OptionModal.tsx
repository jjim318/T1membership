// src/app/shop/[itemNo]/_components/OptionModal.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import {
    ApiResult,
    MemberReadOneRes,
    OptionKind,
    SizeOption,
    PlayerOption,
    OPTION_KIND_TABLE,
    SIZE_TABLE,
    PLAYER_TABLE,
    ItemDetail,
    extractEmailFromJwt,
    getMembershipTypeFromClient,
} from "./types";

type PurchaseMode = "CART" | "BUY";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: ItemDetail;
    onCartSuccess: () => void;
}

export default function OptionModal({
                                        isOpen,
                                        onClose,
                                        item,
                                        onCartSuccess,
                                    }: Props) {
    const router = useRouter();

    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [showOptionList, setShowOptionList] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [optionError, setOptionError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [showMembershipModal, setShowMembershipModal] = useState(false);
    const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

    const optionKind: OptionKind =
        OPTION_KIND_TABLE[item.itemNo] ?? "SIZE";

    const sizeOptions: SizeOption[] = SIZE_TABLE[item.itemNo] ?? [];
    const playerOptions: PlayerOption[] = PLAYER_TABLE[item.itemNo] ?? [];

    const optionTitle =
        optionKind === "SIZE"
            ? "size 선택"
            : optionKind === "PLAYER"
                ? "PLAYER 선택"
                : "수량 선택";

    // 모달 열릴 때마다 초기화
    useEffect(() => {
        if (isOpen) {
            setSelectedSize(null);
            setSelectedPlayer(null);
            setShowOptionList(false);
            setQuantity(1);
            setOptionError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const increaseQty = () => {
        if (optionKind === "PLAYER") return;
        setQuantity((q) => q + 1);
    };

    const decreaseQty = () => {
        if (optionKind === "PLAYER") return;
        setQuantity((q) => (q > 1 ? q - 1 : 1));
    };

    const hasSelection =
        (optionKind === "SIZE" && !!selectedSize) ||
        (optionKind === "PLAYER" && !!selectedPlayer) ||
        optionKind === "QTY_ONLY";

    const calcTotalPrice = (): number => {
        let unitPrice = item.itemPrice;

        if (optionKind === "SIZE" && selectedSize) {
            const opt = sizeOptions.find((s) => s.value === selectedSize);
            if (opt) unitPrice = opt.price;
        }

        if (optionKind === "PLAYER" && selectedPlayer) {
            const opt = playerOptions.find((p) => p.value === selectedPlayer);
            if (opt) unitPrice = opt.price;
        }

        const qty = optionKind === "PLAYER" ? 1 : quantity;
        return unitPrice * qty;
    };

    const fetchIsMembershipUser = async (): Promise<
        "YES" | "NO" | "LOGIN_REQUIRED" | "ERROR"
    > => {
        try {
            const res = await apiClient.get<ApiResult<MemberReadOneRes>>(
                "/member/readOne",
            );
            const membershipType = res.data.result?.membershipType;
            if (!membershipType || membershipType === "NO_MEMBERSHIP") {
                return "NO";
            }
            return "YES";
        } catch (e: any) {
            console.error("멤버십 상태 조회 실패 =", e);
            const status = e.response?.status;

            if (status === 401) {
                return "LOGIN_REQUIRED";
            }
            return "ERROR";
        }
    };

    const handleConfirmWithOptions = async (mode: PurchaseMode) => {
        if (!item) {
            setOptionError("상품 정보를 불러오지 못했습니다.");
            return;
        }

        const hasToken =
            typeof window !== "undefined" &&
            !!localStorage.getItem("accessToken");
        if (!hasToken) {
            setShowLoginRequiredModal(true);
            return;
        }

        let memberEmail =
            typeof window !== "undefined"
                ? localStorage.getItem("memberEmail")
                : null;

        if (!memberEmail && typeof window !== "undefined") {
            const token = localStorage.getItem("accessToken");
            const fromJwt = extractEmailFromJwt(token);
            if (fromJwt) {
                memberEmail = fromJwt;
                localStorage.setItem("memberEmail", fromJwt);
                console.log("JWT에서 memberEmail 복구 =", fromJwt);
            }
        }

        if (!memberEmail) {
            console.warn("memberEmail 없음 → 로그인 모달");
            setShowLoginRequiredModal(true);
            return;
        }

        // 옵션 필수 체크
        if (optionKind === "SIZE" && !selectedSize) {
            setOptionError("size를 선택해주세요.");
            return;
        }
        if (optionKind === "PLAYER" && !selectedPlayer) {
            setOptionError("PLAYER를 선택해주세요.");
            return;
        }

        const qty = optionKind === "PLAYER" ? 1 : quantity;

        const optionValue =
            optionKind === "SIZE"
                ? selectedSize
                : optionKind === "PLAYER"
                    ? selectedPlayer
                    : null;

        const optionLabel =
            optionKind === "SIZE" && selectedSize
                ? `size / ${selectedSize}`
                : optionKind === "PLAYER" && selectedPlayer
                    ? `PLAYER / ${selectedPlayer}`
                    : null;

        const cartPayload = {
            itemNo: item.itemNo,
            quantity: qty,
            optionKind,
            optionValue,
            optionLabel,
        };

        try {
            setLoading(true);
            setOptionError(null);

            // CART 모드
            if (mode === "CART") {
                const url = `/cart/${encodeURIComponent(memberEmail)}/items`;

                const res = await apiClient.post<ApiResult<unknown>>(
                    url,
                    cartPayload,
                );

                console.log("✅ CART 성공 =", res.data);

                onCartSuccess();
                return;
            }

            // BUY 모드 (MD, 멤버십 전용 체크)
            if (item.itemCategory === "MD") {
                const jwtMembershipType = getMembershipTypeFromClient();

                if (jwtMembershipType === "NO_MEMBERSHIP") {
                    setShowMembershipModal(true);
                    return;
                }

                if (
                    jwtMembershipType === "ONE_TIME" ||
                    jwtMembershipType === "YEARLY" ||
                    jwtMembershipType === "RECURRING"
                ) {
                    // 통과
                } else {
                    const membershipCheck = await fetchIsMembershipUser();

                    if (membershipCheck === "LOGIN_REQUIRED") {
                        setShowLoginRequiredModal(true);
                        return;
                    }
                    if (membershipCheck === "ERROR") {
                        setShowMembershipModal(true);
                        return;
                    }
                    if (membershipCheck === "NO") {
                        setShowMembershipModal(true);
                        return;
                    }
                }
            }

            const params = new URLSearchParams({
                itemNo: String(item.itemNo),
                quantity: String(qty),
            });

            if (optionKind === "SIZE" && selectedSize) {
                params.append("size", selectedSize);
            }
            if (optionKind === "PLAYER" && selectedPlayer) {
                params.append("player", selectedPlayer);
            }

            onClose();
            router.push(`/order/goods/checkout?${params.toString()}`);
        } catch (e: any) {
            console.error("요청 실패 =", e);
            if (e.response) {
                console.error("status =", e.response.status);
                console.error("data   =", e.response.data);
            }
            setOptionError("요청 처리 중 오류가 발생했습니다.");
            alert("요청 처리 중 오류가 발생했습니다. (콘솔 로그 확인)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* 옵션 선택 모달 */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-5 py-4 shadow-xl border border-zinc-700">
                    {/* 헤더 */}
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-zinc-300">
                            {optionTitle}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-zinc-200 text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* 옵션 선택 (SIZE) */}
                    {optionKind === "SIZE" && (
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowOptionList((v) => !v)
                                }
                                className="flex w-full items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                            >
                                <span>
                                    {selectedSize
                                        ? `size / ${selectedSize}`
                                        : "size 선택"}
                                </span>
                                <span className="text-xs text-zinc-400">
                                    ▼
                                </span>
                            </button>

                            {showOptionList && (
                                <div className="mt-2 space-y-1">
                                    {sizeOptions.map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            disabled={s.soldOut}
                                            onClick={() => {
                                                if (s.soldOut) return;
                                                setSelectedSize(s.value);
                                                setShowOptionList(false);
                                            }}
                                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                                s.soldOut
                                                    ? "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed"
                                                    : selectedSize === s.value
                                                        ? "border-red-500 bg-zinc-800 text-white"
                                                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                            }`}
                                        >
                                            <span>
                                                {s.label}
                                                {s.soldOut && " [품절]"}
                                            </span>
                                            <span>
                                                {s.price.toLocaleString("ko-KR")}원
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 옵션 선택 (PLAYER) */}
                    {optionKind === "PLAYER" && (
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowOptionList((v) => !v)
                                }
                                className="flex w-full items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                            >
                                <span>
                                    {selectedPlayer
                                        ? `PLAYER / ${selectedPlayer}`
                                        : "PLAYER 선택"}
                                </span>
                                <span className="text-xs text-zinc-400">
                                    ▼
                                </span>
                            </button>

                            {showOptionList && (
                                <div className="mt-2 space-y-1">
                                    {playerOptions.map((p) => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            disabled={p.soldOut}
                                            onClick={() => {
                                                if (p.soldOut) return;
                                                setSelectedPlayer(p.value);
                                                setShowOptionList(false);
                                                setQuantity(1);
                                            }}
                                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                                p.soldOut
                                                    ? "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed"
                                                    : selectedPlayer === p.value
                                                        ? "border-red-500 bg-zinc-800 text-white"
                                                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                            }`}
                                        >
                                            <span>
                                                {p.label}
                                                {p.soldOut && " [품절]"}
                                            </span>
                                            <span>
                                                {p.price.toLocaleString("ko-KR")}원
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* QTY_ONLY는 옵션 리스트 없음 */}

                    {/* 선택된 옵션 / 수량 & 금액 */}
                    {hasSelection && (
                        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3">
                            <div className="mb-2 flex items-center justify-between text-sm text-zinc-100">
                                <span>
                                    {optionKind === "SIZE" &&
                                        selectedSize &&
                                        `size / ${selectedSize}`}
                                    {optionKind === "PLAYER" &&
                                        selectedPlayer &&
                                        `PLAYER / ${selectedPlayer}`}
                                    {optionKind === "QTY_ONLY" &&
                                        item.itemName}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center rounded-md border border-zinc-700">
                                    <button
                                        type="button"
                                        onClick={decreaseQty}
                                        disabled={optionKind === "PLAYER"}
                                        className={`px-3 py-1 text-sm ${
                                            optionKind === "PLAYER"
                                                ? "text-zinc-500 cursor-not-allowed"
                                                : "text-zinc-300 hover:bg-zinc-800"
                                        }`}
                                    >
                                        -
                                    </button>
                                    <span className="px-4 py-1 text-sm text-white">
                                        {optionKind === "PLAYER"
                                            ? 1
                                            : quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={increaseQty}
                                        disabled={optionKind === "PLAYER"}
                                        className={`px-3 py-1 text-sm ${
                                            optionKind === "PLAYER"
                                                ? "text-zinc-500 cursor-not-allowed"
                                                : "text-zinc-300 hover:bg-zinc-800"
                                        }`}
                                    >
                                        +
                                    </button>
                                </div>

                                <span className="text-sm font-semibold text-white">
                                    {calcTotalPrice().toLocaleString("ko-KR")}원
                                </span>
                            </div>
                        </div>
                    )}

                    {optionError && (
                        <p className="mb-2 text-center text-xs text-red-300">
                            {optionError}
                        </p>
                    )}

                    {optionKind === "PLAYER" && (
                        <p className="mb-3 text-[11px] text-zinc-400 text-left">
                            1인당 각 옵션별로 1개까지 구매할 수 있어요.
                        </p>
                    )}

                    {/* 하단 버튼 */}
                    <div className="mt-2 flex gap-3">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                                handleConfirmWithOptions("CART")
                            }
                            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                                loading
                                    ? "border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed"
                                    : "border-zinc-500 text-white bg-black hover:bg-zinc-900"
                            }`}
                        >
                            장바구니
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                                handleConfirmWithOptions("BUY")
                            }
                            className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-300"
                        >
                            바로 구매
                        </button>
                    </div>
                </div>
            </div>

            {/* 멤버십 전용 안내 모달 */}
            {showMembershipModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-6 py-5 shadow-xl border border-zinc-700">
                        <p className="mb-6 text-center text-sm text-zinc-100">
                            멤버십 회원만 구매할 수 있어요
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowMembershipModal(false)}
                                className="flex-1 rounded-xl bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-600"
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    router.push("/membership/join")
                                }
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                멤버십 가입
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 로그인 필요 모달 */}
            {showLoginRequiredModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-6 py-5 shadow-xl border border-zinc-700">
                        <p className="mb-2 text-center text-sm font-semibold text-zinc-100">
                            로그인이 필요해요
                        </p>
                        <p className="mb-6 text-center text-xs text-zinc-300">
                            로그인 후 구매할 수 있어요.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowLoginRequiredModal(false)
                                }
                                className="flex-1 rounded-xl bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-600"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowLoginRequiredModal(false);
                                    router.push("/login");
                                }}
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                로그인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
