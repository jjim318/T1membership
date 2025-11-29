// src/app/shop/[itemNo]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

// ===== 타입 정의 =====
type ItemCategory = "MD" | "MEMBERSHIP" | "POP" | "ALL";
type ItemSellStatus = "SELL" | "SOLD_OUT" | string;
type PurchaseMode = "CART" | "BUY";
type OptionKind = "SIZE" | "PLAYER" | "QTY_ONLY";
type MembershipPayType = "ONE_TIME" | "YEARLY" | "RECURRING" | "NO_MEMBERSHIP";

interface ExistingImageDTO {
    fileName: string;
    sortOrder: number | null;
}

// 🔥 상세 이미지용 타입 (url 추가)
type DetailImage = ExistingImageDTO & { url: string };

interface ItemDetail {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: ItemCategory;
    itemSellStatus: ItemSellStatus;
    images: ExistingImageDTO[];
    membershipPayType: MembershipPayType;
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

type SizeOption = {
    value: string;
    label: string;
    price: number;
    soldOut: boolean;
};

type PlayerOption = {
    value: string;
    label: string;
    price: number;
    soldOut: boolean;
};

// ===== 상품별 옵션 타입 맵핑 =====
const OPTION_KIND_TABLE: Record<number, OptionKind> = {
    1: "SIZE", // 저지
    2: "PLAYER", // 선수 인형
    3: "QTY_ONLY", // 티켓 홀더
};

// ===== 상품별 사이즈 옵션 테이블 (저지 등) =====
const SIZE_TABLE: Record<number, SizeOption[]> = {
    1: [
        { value: "S", label: "S", price: 189000, soldOut: false },
        { value: "M", label: "M", price: 189000, soldOut: true },
        { value: "L", label: "L", price: 189000, soldOut: false },
        { value: "XL", label: "XL", price: 189000, soldOut: false },
        { value: "2XL", label: "2XL", price: 189000, soldOut: false },
    ],
    // 다른 저지 상품 생기면 여기 추가
};

// ===== 상품별 PLAYER 옵션 테이블 (선수 인형 등) =====
const PLAYER_TABLE: Record<number, PlayerOption[]> = {
    2: [
        { value: "DORAN", label: "DORAN", price: 25000, soldOut: true },
        { value: "ONER", label: "ONER", price: 25000, soldOut: true },
        { value: "FAKER", label: "FAKER", price: 25000, soldOut: true },
        { value: "GUMAYUSI", label: "GUMAYUSI", price: 25000, soldOut: true },
        { value: "KERIA", label: "KERIA", price: 25000, soldOut: true },
        { value: "SMASH", label: "SMASH", price: 25000, soldOut: false },
    ],
    // 다른 인형 상품 생기면 여기 추가
};

// JWT(accessToken)에서 이메일(sub or memberEmail) 추출
function extractEmailFromJwt(token: string | null): string | null {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");

        const padded = payloadPart.padEnd(
            Math.ceil(payloadPart.length / 4) * 4,
            "=",
        );

        const json = atob(padded);
        const payload = JSON.parse(json);

        // 형님 JWT 는 sub에 이메일이 있을 가능성이 큼
        return payload.sub ?? payload.memberEmail ?? null;
    } catch (e) {
        console.error("JWT decode 실패 =", e);
        return null;
    }
}

export default function ShopDetailPage() {
    const params = useParams<{ itemNo: string }>();
    const router = useRouter();
    const itemNo = Number(params?.itemNo);

    const [item, setItem] = useState<ItemDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 상세 배송 옵션
    const [showShippingDetail, setShowShippingDetail] = useState(false);

    // 장바구니/구매 로딩 상태
    const [cartLoading, setCartLoading] = useState(false);

    // ===== 옵션 선택 모달 상태 =====
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [showOptionList, setShowOptionList] = useState(false); // SIZE & PLAYER 공용
    const [quantity, setQuantity] = useState(1);
    const [optionError, setOptionError] = useState<string | null>(null);

    // ===== 멤버십 전용 안내 모달 =====
    const [showMembershipModal, setShowMembershipModal] = useState(false);

    // 🔥 로그인 필요 모달
    const [showLoginRequiredModal, setShowLoginRequiredModal] =
        useState(false);

    // TODO: 실제 로그인/멤버십 여부로 교체
    const isMembershipUser = false;
    const isMembershipItem = item?.itemCategory === "MEMBERSHIP";


    // 🔥 장바구니 토스트
    const [showCartToast, setShowCartToast] = useState(false);
    const cartToastTimerRef = useRef<number | null>(null);

    // ===== 데이터 로딩 =====
    useEffect(() => {
        if (!itemNo || Number.isNaN(itemNo)) {
            setErrorMsg("잘못된 상품 번호입니다.");
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<ItemDetail>>(
                    `/item/${itemNo}`,
                );
                setItem(res.data.result);
            } catch (e) {
                console.error(e);
                setErrorMsg("상품 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [itemNo]);

    // 🔥 토스트 타이머 정리
    useEffect(() => {
        return () => {
            if (cartToastTimerRef.current) {
                window.clearTimeout(cartToastTimerRef.current);
            }
        };
    }, []);

    // ===== 로딩/에러 분기 =====
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                로딩 중...
            </div>
        );
    }

    if (errorMsg || !item) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
                <p>{errorMsg ?? "상품 정보를 찾을 수 없습니다."}</p>
                <Link href="/shop" className="text-sm text-zinc-400 underline">
                    ← SHOP으로 돌아가기
                </Link>
            </div>
        );
    }

    // ===== 여기부터는 item 이 확실히 존재 =====

    // 이미지 정리
    const sortedImages = [...(item.images ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    const rawThumb = sortedImages[0]?.fileName ?? "/shop/placeholder.png";
    const thumbnailUrl =
        rawThumb.startsWith("http") || rawThumb.startsWith("/")
            ? rawThumb
            : `/${rawThumb}`;

    const detailImages: DetailImage[] = (isMembershipItem
            ? sortedImages          // 🔥 멤버십이면 0번(= image_order 1)도 포함
            : sortedImages.slice(1) // 굿즈는 기존처럼 0번을 썸네일로 빼고 나머지만
    ).map((img) => {
        const raw = img.fileName;
        const url =
            raw.startsWith("http") || raw.startsWith("/")
                ? raw
                : `/${raw}`;
        return { ...img, url };
    });


    const isSoldOut =
        item.itemSellStatus === "SOLD_OUT" || item.itemStock <= 0;
    const isMembershipOnly =
        item.itemCategory === "MD" || item.itemCategory === "MEMBERSHIP";

    // 이 상품이 어떤 옵션 구조인지
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

    // 🔥 여기서 멤버십 상품이면, 굿즈용 레이아웃 안 쓰고
    //    아래 MembershipDetailBody 로 바로 분기
    if (item.itemCategory === "MEMBERSHIP") {
        return (
            <MembershipDetailBody
                item={item}
                detailImages={detailImages}
            />
        );
    }

    // ===== 모달 열기/닫기 =====
    const openOptionModal = () => {
        if (isSoldOut) return;

        setIsOptionModalOpen(true);
        setOptionError(null);
        setShowOptionList(false);
        setSelectedSize(null);
        setSelectedPlayer(null);
        setQuantity(1);
    };

    const closeOptionModal = () => {
        setIsOptionModalOpen(false);
    };

    // ===== 수량 조절 =====
    const increaseQty = () => {
        if (optionKind === "PLAYER") return; // 인형은 1개 제한
        setQuantity((q) => q + 1);
    };

    const decreaseQty = () => {
        if (optionKind === "PLAYER") return; // 인형은 1개 제한
        setQuantity((q) => (q > 1 ? q - 1 : 1));
    };

    const handleConfirmWithOptions = async (mode: PurchaseMode) => {
        if (!item) {
            setOptionError("상품 정보를 불러오지 못했습니다.");
            return;
        }

        // === 로그인 여부 체크 (토큰) ===
        const hasToken =
            typeof window !== "undefined" &&
            !!localStorage.getItem("accessToken");

        if (!hasToken) {
            setShowLoginRequiredModal(true);
            return;
        }

        // 🔥 1차: localStorage 에서 이메일 꺼내기
        let memberEmail =
            typeof window !== "undefined"
                ? localStorage.getItem("memberEmail")
                : null;

        // 🔥 2차: 그래도 없으면 JWT 에서 추출해서 채워넣기
        if (!memberEmail && typeof window !== "undefined") {
            const token = localStorage.getItem("accessToken");
            const fromJwt = extractEmailFromJwt(token);
            if (fromJwt) {
                memberEmail = fromJwt;
                localStorage.setItem("memberEmail", fromJwt); // 다음부터는 바로 사용 가능
                console.log("JWT에서 memberEmail 복구 =", fromJwt);
            }
        }

        if (!memberEmail) {
            console.warn("memberEmail 이 없어서 로그인 모달 오픈");
            setShowLoginRequiredModal(true);
            return;
        }

        // === 필수 옵션 체크 ===
        if (optionKind === "SIZE" && !selectedSize) {
            setOptionError("size를 선택해주세요.");
            return;
        }
        if (optionKind === "PLAYER" && !selectedPlayer) {
            setOptionError("PLAYER를 선택해주세요.");
            return;
        }

        const qty = optionKind === "PLAYER" ? 1 : quantity;

        // 👉 AddCartItemReq 에 맞는 최소 payload (itemNo + quantity)
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
            optionKind, // "SIZE" | "PLAYER" | "QTY_ONLY"
            optionValue, // "S", "M", "FAKER" 같은 실제 값
            optionLabel, // 화면에 바로 보여줄 한글 라벨
        };

        try {
            setCartLoading(true);
            setOptionError(null);

            if (mode === "CART") {
                const url = `/cart/${encodeURIComponent(memberEmail)}/items`;

                const res = await apiClient.post<ApiResult<unknown>>(
                    url,
                    cartPayload,
                );

                console.log("✅ CART 성공 res =", res.data);

                // 모달 닫기
                setIsOptionModalOpen(false);

                // 🔥 토스트 켜기
                setShowCartToast(true);
                console.log("✅ showCartToast=true 로 변경");

                // 이전 타이머 있으면 제거
                if (cartToastTimerRef.current !== null) {
                    window.clearTimeout(cartToastTimerRef.current);
                }

                // 3초 뒤 자동으로 닫기
                cartToastTimerRef.current = window.setTimeout(() => {
                    console.log("⏰ 토스트 자동 종료");
                    setShowCartToast(false);
                }, 3000);

                return;
            }

            // === 아래는 BUY 로직 (기존 그대로) ===
            if (!isMembershipUser) {
                setShowMembershipModal(true);
                return;
            }

            const orderPayload: any = {
                itemNo: item.itemNo,
                quantity: qty,
            };
            // 필요하면 옵션 정보도 여기에 추가

            const res = await apiClient.post<
                ApiResult<{ orderNo: number }>
            >("/order/create-single", orderPayload);

            const orderNo = res.data.result.orderNo;
            setIsOptionModalOpen(false);
            router.push(`/order/checkout/${orderNo}`);
        } catch (e: any) {
            console.error("장바구니 추가 실패 =", e);
            if (e.response) {
                console.error("status =", e.response.status);
                console.error("data   =", e.response.data);
            }
            setOptionError("요청 처리 중 오류가 발생했습니다.");
            alert(
                "장바구니 담기 중 오류가 발생했습니다. (콘솔 로그 확인)",
            );
        } finally {
            setCartLoading(false);
        }
    };

    // ===== 금액 계산 (옵션 타입별로 단가 결정) =====
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

    const hasSelection =
        (optionKind === "SIZE" && !!selectedSize) ||
        (optionKind === "PLAYER" && !!selectedPlayer) ||
        optionKind === "QTY_ONLY";

    return (
        <div className="min-h-screen bg-black text-white">
            {/* 🔥 장바구니 토스트 (좌측 하단) */}
            {showCartToast && (
                <div
                    className="fixed"
                    style={{
                        left: 16,
                        bottom: 16,
                        top: "auto",
                        zIndex: 9999,
                    }}
                >
                    <div
                        className="flex items-center gap-4 rounded-md px-4 py-3 text-sm shadow-lg"
                        style={{
                            backgroundColor: "#ffffff",
                            color: "#111111",
                        }}
                    >
                        <span>장바구니에 상품을 담았어요.</span>
                        <button
                            type="button"
                            onClick={() => {
                                setShowCartToast(false);
                                router.push("/shop/cart");
                            }}
                            style={{ color: "#0b74de", fontWeight: 600 }}
                        >
                            보러가기
                        </button>
                    </div>
                </div>
            )}

            {/* 내용이 고정 푸터에 가리지 않도록 아래쪽 패딩 넉넉히 */}
            <main className="mx-auto max-w-4xl px-4 pb-28 pt-6">
                {/* 상단: 뒤로가기 + 공유 */}
                <header className="mb-4 flex items-center justify-between">
                    <Link
                        href="/shop"
                        className="text-sm text-zinc-400 hover:text-white"
                    >
                        ← SHOP
                    </Link>
                    <button
                        className="text-zinc-400 text-lg"
                        aria-label="공유"
                    >
                        ⤴
                    </button>
                </header>

                {/* 썸네일 */}
                <section className="mb-6">
                    <div className="relative w-full overflow-hidden">
                        <Image
                            src={thumbnailUrl}
                            alt={item.itemName}
                            width={1024}
                            height={1024}
                            className="h-auto w-full object-cover"
                        />
                    </div>
                </section>

                {/* ===== 썸네일 아래 영역 ===== */}
                <section className="mb-8 border-b border-zinc-800 pb-6">
                    <h1 className="text-lg font-semibold leading-snug">
                        {item.itemName}
                    </h1>

                    <p className="mt-3 text-2xl font-bold">
                        {item.itemPrice.toLocaleString("ko-KR")}원
                    </p>

                    {/* 멤버십 전용 배너 (MD/MEMBERSHIP 공통) */}
                    {isMembershipOnly && (
                        <div className="mt-4 flex items-center justify-between rounded-md bg-red-900/80 px-4 py-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-base">❤️</span>
                                <span>멤버십 회원만 구매할 수 있어요</span>
                            </div>
                            <button className="text-xs font-semibold text-red-200">
                                가입 &gt;
                            </button>
                        </div>
                    )}

                    {/* ===== 배송 정보 + 상세 배송 옵션 아코디언 ===== */}
                    <div className="mt-6 text-xs">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                <span className="text-zinc-400">
                                    배송 정보
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowShippingDetail((prev) => !prev)
                                    }
                                    className="text-zinc-100 hover:text-white"
                                >
                                    상세 배송 옵션
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowShippingDetail((prev) => !prev)
                                }
                                aria-label="상세 배송 옵션 열기"
                                className="text-zinc-400 text-lg"
                            >
                                {showShippingDetail ? "▴" : "▾"}
                            </button>
                        </div>

                        {showShippingDetail && (
                            <div className="mt-4 space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-[11px] leading-relaxed text-zinc-300">
                                <div>
                                    <p className="text-xs font-semibold text-white">
                                        국내 배송
                                    </p>
                                    <p className="mt-1">
                                        CJ대한통운 / 기본 3,000원, 도서산간
                                        6,000원
                                        <br />
                                        (50,000원 이상 구매 시 무료 배송)
                                    </p>
                                    <p className="mt-1 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[10px] text-zinc-300">
                                        출고 이후 3영업일 소요 예상
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-white">
                                        해외 배송
                                    </p>
                                    <p className="mt-1">
                                        DHL / 배송 국가 및 무게에 따라
                                        배송비가 책정됩니다.
                                    </p>
                                    <p className="mt-1 inline-flex rounded-full border border-zinc-700 px-2 py-[2px] text-[10px] text-zinc-300">
                                        출고 이후 5영업일 이상 소요 예상
                                    </p>
                                </div>
                            </div>
                        )}

                        <p className="mt-3 text-[11px] text-zinc-400">
                            국내·해외 배송이 가능한 상품이에요.
                        </p>
                    </div>
                </section>

                {/* ===== 상품 상세설명 이미지 ===== */}
                <section className="mt-10 space-y-6 pb-4">
                    {detailImages.map((img) => (
                        <div
                            key={`${img.url}-${img.sortOrder}`}
                            className="relative w-full overflow-hidden"
                        >
                            <Image
                                src={img.url}
                                alt={item.itemName}
                                width={1200}
                                height={1600}
                                className="h-auto w-full object-cover"
                            />
                        </div>
                    ))}
                </section>
            </main>

            {/* ================== 옵션 선택 모달 ================== */}
            {isOptionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md rounded-2xl bg-zinc-900 px-5 py-4 shadow-xl border border-zinc-700">
                        {/* 헤더 */}
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-zinc-300">
                                {optionTitle}
                            </span>
                            <button
                                type="button"
                                onClick={closeOptionModal}
                                className="text-zinc-400 hover:text-zinc-200 text-lg leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* ===== 옵션 선택 영역 (SIZE / PLAYER) ===== */}
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
                                                        : selectedSize ===
                                                        s.value
                                                            ? "border-red-500 bg-zinc-800 text-white"
                                                            : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                                }`}
                                            >
                                                <span>
                                                    {s.label}
                                                    {s.soldOut && " [품절]"}
                                                </span>
                                                <span>
                                                    {s.price.toLocaleString(
                                                        "ko-KR",
                                                    )}
                                                    원
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

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
                                                    setQuantity(1); // 인당 1개 고정
                                                }}
                                                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                                    p.soldOut
                                                        ? "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed"
                                                        : selectedPlayer ===
                                                        p.value
                                                            ? "border-red-500 bg-zinc-800 text-white"
                                                            : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                                }`}
                                            >
                                                <span>
                                                    {p.label}
                                                    {p.soldOut && " [품절]"}
                                                </span>
                                                <span>
                                                    {p.price.toLocaleString(
                                                        "ko-KR",
                                                    )}
                                                    원
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* QTY_ONLY는 별도 옵션 선택 UI 없음 */}

                        {/* ===== 선택된 옵션 / 수량 & 금액 ===== */}
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
                                    {/* 수량 조절 */}
                                    <div className="inline-flex items-center rounded-md border border-zinc-700">
                                        <button
                                            type="button"
                                            onClick={decreaseQty}
                                            disabled={
                                                optionKind === "PLAYER"
                                            }
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
                                            disabled={
                                                optionKind === "PLAYER"
                                            }
                                            className={`px-3 py-1 text-sm ${
                                                optionKind === "PLAYER"
                                                    ? "text-zinc-500 cursor-not-allowed"
                                                    : "text-zinc-300 hover:bg-zinc-800"
                                            }`}
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* 금액 */}
                                    <span className="text-sm font-semibold text-white">
                                        {calcTotalPrice().toLocaleString(
                                            "ko-KR",
                                        )}
                                        원
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 에러 메시지 */}
                        {optionError && (
                            <p className="mb-2 text-center text-xs text-red-300">
                                {optionError}
                            </p>
                        )}

                        {/* 🔥 PLAYER 전용 안내 문구 */}
                        {optionKind === "PLAYER" && (
                            <p className="mb-3 text-[11px] text-zinc-400 text-left">
                                1인당 각 옵션별로 1개까지 구매할 수 있어요.
                            </p>
                        )}

                        {/* 모달 하단 버튼: 장바구니 / 바로구매 */}
                        <div className="mt-2 flex gap-3">
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={() =>
                                    handleConfirmWithOptions("CART")
                                }
                                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                                    cartLoading
                                        ? "border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed"
                                        : "border-zinc-500 text-white bg-black hover:bg-zinc-900"
                                }`}
                            >
                                장바구니
                            </button>
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={() =>
                                    handleConfirmWithOptions("BUY")
                                }
                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                바로 구매
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================== 멤버십 전용 안내 모달 ================== */}
            {showMembershipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
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

            {/* 🔥 로그인 필요 모달 */}
            {showLoginRequiredModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
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

            {/* ================== 하단 고정 푸터 ================== */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 backdrop-blur-sm">
                <div className="mx-auto max-w-4xl px-4 py-3">
                    {isSoldOut ? (
                        <button
                            type="button"
                            disabled
                            className="w-full rounded-xl py-3 text-sm font-semibold text-center bg-zinc-700 text-zinc-400 cursor-not-allowed"
                        >
                            품절
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            {/* 장바구니 버튼 */}
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={openOptionModal}
                                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-center border ${
                                    cartLoading
                                        ? "border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed"
                                        : "border-zinc-500 text-white bg-black hover:bg-zinc-900"
                                }`}
                            >
                                장바구니
                            </button>

                            {/* 구매하기 버튼 */}
                            <button
                                type="button"
                                disabled={cartLoading}
                                onClick={openOptionModal}
                                className="flex-1 rounded-xl py-3 text-sm font-semibold text-center bg-red-600 text-white hover:bg-red-500"
                            >
                                구매하기
                            </button>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}

// ─────────────────────────────────────
// 멤버십 정기권 전용 상세 레이아웃
// ─────────────────────────────────────
function MembershipDetailBody({
                                  item,
                                  detailImages,
                              }: {
    item: ItemDetail;
    detailImages: DetailImage[];
}) {
    // 결제 통화 아코디언
    const [currency, setCurrency] = useState<"KRW" | "USD">("KRW");
    const [openCurrency, setOpenCurrency] = useState(false);

    const currencyLabel =
        currency === "KRW"
            ? "KRW - 한국 ₩(원)"
            : "USD - 미국 $(달러)";

    const thumbnailImage = detailImages[0];
    const otherImages = detailImages.slice(1);
    // KRW 가격은 백에서 내려오는 값
    const priceKRW = item.itemPrice;

    // 🔥 membershipPayType 에 따라 USD 가격 자동 결정
    const payType = (item.membershipPayType || "").toUpperCase();

    let priceUSD = 6.30; // 기본값: 정기(RECURRING)

    if (item.membershipPayType === "ONE_TIME") {
        priceUSD = 6.50; // 단건
    }

    if (item.membershipPayType === "YEARLY") {
        priceUSD = 60.00; // 예: 연간권 - 형님 바꾸고 싶은 값 직접 수정 가능
    }

// NO_MEMBERSHIP 는 일반 상품 → USD 필요없으면 기본 유지하거나 숨기면 됨


    return (
        <main className="min-h-screen bg-black text-zinc-100">
            <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-16 pb-24">
                {/* 상단: 제목 + 통화 선택 */}
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">
                        멤버십 가입하기
                    </h1>

                    {/* 결제 단위 드롭다운 (아코디언) */}
                    <div className="relative text-xs">
                        <button
                            type="button"
                            onClick={() => setOpenCurrency((v) => !v)}
                            className="flex min-w-[180px] items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                        >
                            <span>{currencyLabel}</span>
                            <span className="ml-2 text-[10px]">▼</span>
                        </button>

                        {openCurrency && (
                            <div className="absolute right-0 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 py-1 text-xs shadow-lg">
                                <button
                                    type="button"
                                    className="flex w-full items-center px-3 py-2 hover:bg-zinc-800"
                                    onClick={() => {
                                        setCurrency("KRW");
                                        setOpenCurrency(false);
                                    }}
                                >
                                    KRW - 한국 ₩(원)
                                </button>
                                <button
                                    type="button"
                                    className="flex w-full items-center px-3 py-2 hover:bg-zinc-800"
                                    onClick={() => {
                                        setCurrency("USD");
                                        setOpenCurrency(false);
                                    }}
                                >
                                    USD - 미국 $(달러)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 상단 썸네일 + 상품명 */}
                <div className="mt-4 flex flex-col items-center">
                    {thumbnailImage && (
                        <div className="mb-4">
                            <Image
                                src={thumbnailImage.url}
                                alt={`${item.itemName} 썸네일`}
                                width={96}
                                height={96}
                                className="h-24 w-24 rounded-2xl object-cover"
                                priority
                            />
                        </div>
                    )}
                    <h2 className="text-base font-semibold text-center">
                        {item.itemName}
                    </h2>
                </div>

                {/* 설명용 큰 이미지들 */}
                {otherImages.length > 0 && (
                    <div className="mt-8 w-full space-y-4">
                        {otherImages.map((img, idx) => (
                            <div
                                key={`${img.url}-${img.sortOrder ?? idx}`}
                                className="relative w-full overflow-hidden rounded-xl bg-zinc-900"
                            >
                                <Image
                                    src={img.url}
                                    alt={`${item.itemName} 상세 이미지 ${idx + 1}`}
                                    width={1200}
                                    height={1600}
                                    className="h-auto w-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 옵션 선택 + 정기결제 카드 (좌측 정렬) */}
                <div className="mt-16 w-full max-w-3xl">
                    <p className="mb-3 text-xs font-semibold text-zinc-200">
                        옵션 선택
                    </p>

                    <div className="w-[360px] rounded-2xl border border-zinc-700 bg-zinc-950 px-8 py-7 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        {/* 제목 / 가격 */}
                        <div className="space-y-1">
                            <h2 className="text-sm font-semibold">
                                {item.itemName}
                            </h2>
                            <p className="text-xs text-zinc-300">
                                {currency === "KRW"
                                    ? `${priceKRW.toLocaleString("ko-KR")}원/1개월`
                                    : `$${priceUSD.toFixed(2)}/1개월`}
                            </p>

                        </div>

                        {/* 혜택 목록 – 일단 하드코딩 */}
                        <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 콘텐츠</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>스타 스토리 열람 및 댓글 남기기</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 커뮤니티</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 상품</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 rounded-sm bg-zinc-600" />
                                <span>멤버십 전용 온/오프라인 이벤트</span>
                            </li>
                        </ul>

                        {/* 버튼들: 모양만 */}
                        <div className="mt-6 space-y-2">
                            <button
                                type="button"
                                className="flex h-10 w-full items-center justify-center rounded-md bg-zinc-700 text-xs font-medium text-zinc-200"
                            >
                                자세히
                            </button>
                            <button
                                type="button"
                                className="flex h-10 w-full items-center justify-center rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-500"
                            >
                                가입하기
                            </button>
                        </div>
                    </div>
                </div>

                {/* 유의사항 – 전부 좌측 정렬 */}
                <section className="mt-10 w-full max-w-3xl text-left text-[11px] leading-relaxed text-zinc-400">
                    <p className="mb-2 font-semibold text-zinc-300">
                        유의사항
                    </p>
                    <p>
                        · 상품 구매 후 콘텐츠를 열람하였거나, 이용 시작 후 7일이
                        지나면 구매 확정 처리됩니다.
                    </p>
                    <p>· 구매 확정 이후 청약 철회가 불가합니다.</p>
                    <p>
                        · 더 이상 정기 결제를 원하지 않는 경우, 언제든 해지할 수
                        있습니다. 정기 결제를 해지하더라도 이용 기간 마지막 날까지
                        이용이 가능하며, 이용 기간 종료 후 해지 처리됩니다.
                    </p>
                </section>

                {/* 하단 전체 멤버십 보기 – 이건 중앙 정렬 유지 */}
                <div className="mt-12 flex w-full justify-center border-t border-zinc-800 pt-8">
                    <button
                        type="button"
                        className="text-[13px] font-medium text-sky-400 hover:text-sky-300"
                    >
                        가입 가능한 전체 멤버십 보기 &rarr;
                    </button>
                </div>
            </section>
        </main>
    );
}
