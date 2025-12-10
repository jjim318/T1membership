// src/app/shop/[itemNo]/_components/PopOptionModal.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import {
    ApiResult,
    DetailImage,
    ItemDetail,
    MemberReadOneRes,
    PopPassCount,
    POP_PASS_LABELS,
    POP_PASS_PRICES_MEMBER,
    POP_PASS_PRICES_NON_MEMBER,
    POP_PLAYER_IMAGES,
    POP_PLAYER_OPTIONS,
    getMembershipTypeFromClient,
} from "./types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: ItemDetail;
}

export default function PopOptionModal({ isOpen, onClose, item }: Props) {
    const router = useRouter();

    const [selectedPopCount, setSelectedPopCount] =
        useState<PopPassCount | null>(null);
    const [selectedPopPlayers, setSelectedPopPlayers] = useState<string[]>([]);
    const [isMembershipUserForPop, setIsMembershipUserForPop] = useState<
        boolean | null
    >(null);
    const [optionError, setOptionError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

    // 멤버십 여부 체크 (할인 적용)
    useEffect(() => {
        if (!isOpen) return;

        if (typeof window === "undefined") {
            setIsMembershipUserForPop(false);
            return;
        }

        const token = localStorage.getItem("accessToken");
        if (!token) {
            setIsMembershipUserForPop(false);
            return;
        }

        const mt = getMembershipTypeFromClient();
        if (mt && mt !== "NO_MEMBERSHIP") {
            setIsMembershipUserForPop(true);
            return;
        }

        (async () => {
            try {
                const res =
                    await apiClient.get<ApiResult<MemberReadOneRes>>(
                        "/member/readOne",
                    );
                const membershipType = res.data.result?.membershipType;
                if (
                    membershipType &&
                    membershipType !== "NO_MEMBERSHIP"
                ) {
                    setIsMembershipUserForPop(true);
                } else {
                    setIsMembershipUserForPop(false);
                }
            } catch (e) {
                console.error("POP 멤버십 여부 조회 실패 =", e);
                setIsMembershipUserForPop(false);
            }
        })();
    }, [isOpen]);

    // 모달 열릴 때 상태 초기화
    useEffect(() => {
        if (isOpen) {
            setSelectedPopCount(null);
            setSelectedPopPlayers([]);
            setOptionError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const togglePopPlayer = (value: string) => {
        if (!selectedPopCount) return;

        setSelectedPopPlayers((prev) => {
            const exists = prev.includes(value);
            if (exists) {
                return prev.filter((v) => v !== value);
            }

            if (prev.length >= selectedPopCount) {
                return prev;
            }
            return [...prev, value];
        });
    };

    const popSelectedCount = selectedPopPlayers.length;
    const popMaxCount = selectedPopCount ?? 0;

    const isPopBuyEnabled =
        !!selectedPopCount && popSelectedCount === popMaxCount;

    const getCurrentPopPrice = (): number => {
        if (!selectedPopCount) return item.itemPrice;
        const isMember = isMembershipUserForPop === true;
        const table = isMember
            ? POP_PASS_PRICES_MEMBER
            : POP_PASS_PRICES_NON_MEMBER;
        return table[selectedPopCount];
    };

    const handlePopBuy = async () => {
        if (!item) return;

        const hasToken =
            typeof window !== "undefined" &&
            !!localStorage.getItem("accessToken");
        if (!hasToken) {
            setShowLoginRequiredModal(true);
            return;
        }

        if (!selectedPopCount) {
            setOptionError("이용권을 선택해주세요.");
            return;
        }
        if (selectedPopPlayers.length !== selectedPopCount) {
            setOptionError("선수를 모두 선택해주세요.");
            return;
        }

        const isMember = isMembershipUserForPop === true;
        const table = isMember
            ? POP_PASS_PRICES_MEMBER
            : POP_PASS_PRICES_NON_MEMBER;
        const finalPrice = table[selectedPopCount]; // 참고용

        const passCount = selectedPopCount;
        const players = selectedPopPlayers.join(",");

        const params = new URLSearchParams({
            popId: String(item.itemNo),
            qty: String(passCount),
            variant: players,
        });

        try {
            setLoading(true);
            onClose();
            router.push(`/order/pop/checkout?${params.toString()}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-5 py-4 shadow-xl border border-zinc-700">
                    {/* 헤더 */}
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-zinc-300">
                            구매하기
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-zinc-200 text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* 이용 기간 */}
                    <div className="mb-4">
                        <p className="text-xs text-zinc-400">이용 기간</p>
                        <p className="mt-1 text-sm text-zinc-100">1개월</p>
                    </div>

                    {/* 이용권 선택 */}
                    <div className="mb-4">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                        >
                            <span>이용권 선택</span>
                            <span className="text-xs text-zinc-400">
                                {selectedPopCount
                                    ? `${POP_PASS_LABELS[selectedPopCount]} / ${getCurrentPopPrice().toLocaleString(
                                        "ko-KR",
                                    )}원`
                                    : "선택해주세요"}
                            </span>
                        </button>

                        <div className="mt-2 space-y-1">
                            {([1, 2, 3, 4, 5] as PopPassCount[]).map((cnt) => {
                                const isActive = selectedPopCount === cnt;
                                const isMember = isMembershipUserForPop === true;
                                const table = isMember
                                    ? POP_PASS_PRICES_MEMBER
                                    : POP_PASS_PRICES_NON_MEMBER;
                                const price = table[cnt];

                                return (
                                    <button
                                        key={cnt}
                                        type="button"
                                        onClick={() => {
                                            setSelectedPopCount(cnt);
                                            setSelectedPopPlayers([]);
                                            setOptionError(null);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                            isActive
                                                ? "border-red-500 bg-zinc-800 text-white"
                                                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                        }`}
                                    >
                                        <span>{POP_PASS_LABELS[cnt]}</span>
                                        <span>
                                            {price.toLocaleString("ko-KR")}원
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 스타 선택 */}
                    <div className="mb-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs text-zinc-400">
                                스타 선택
                            </p>
                            <p className="text-[11px] text-zinc-400">
                                {popSelectedCount}/{popMaxCount || "-"}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {POP_PLAYER_OPTIONS.map((player) => {
                                const active =
                                    selectedPopPlayers.includes(player.value);
                                const disabled = !selectedPopCount;

                                return (
                                    <button
                                        key={player.value}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() =>
                                            togglePopPlayer(player.value)
                                        }
                                        className={`flex flex-col items-center rounded-xl border px-2 py-2 text-xs ${
                                            disabled
                                                ? "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed"
                                                : active
                                                    ? "border-red-500 bg-zinc-800 text-white"
                                                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                        }`}
                                    >
                                        <div className="mb-1 h-12 w-12 rounded-full bg-zinc-800 overflow-hidden">
                                            <img
                                                src={
                                                    POP_PLAYER_IMAGES[
                                                        player.value
                                                        ] ??
                                                    "http://localhost:8080/files/default.png"
                                                }
                                                alt={player.label}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <span>{player.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 안내 문구 */}
                    <p className="mb-3 text-[11px] text-zinc-400">
                        한 번에 1개의 이용권만 구매할 수 있어요. 이미
                        구매한 스타의 이용권은 다시 구매할 수 없어요.
                    </p>

                    {/* 에러 메시지 */}
                    {optionError && (
                        <p className="mb-2 text-center text-xs text-red-300">
                            {optionError}
                        </p>
                    )}

                    {/* 하단 가격 + 구매 버튼 */}
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                            {selectedPopCount
                                ? getCurrentPopPrice().toLocaleString(
                                "ko-KR",
                            ) + "원"
                                : ""}
                        </span>
                        <button
                            type="button"
                            disabled={!isPopBuyEnabled || loading}
                            onClick={handlePopBuy}
                            className="ml-3 flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-300"
                        >
                            구매하기
                        </button>
                    </div>
                </div>
            </div>

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
