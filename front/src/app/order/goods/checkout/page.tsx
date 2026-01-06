"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

// ===== 공통 타입 =====
type PaymentMethod = "CARD" | "ACCOUNT";

interface ErrorBody {
    resMessage?: string;
    message?: string;
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface CreateOrderRes {
    orderNo: number;
}

interface TossPrepareResponse {
    isSuccess: boolean;
    resCode?: number;
    resMessage?: string;
    data: {
        orderNo: number;
        orderId: string;
        amount: number;
        orderName: string;
    };
}

interface CheckoutItem {
    itemNo: number;
    imageUrl?: string | null;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    price: number;
    quantity: number;
}

interface CheckoutData {
    buyerName: string;
    buyerEmail: string;
    items: CheckoutItem[];
    totalAmount: number;
}

interface GoodsForm {
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverDetailAddress: string;
    receiverZipCode: string;
    memo: string;
}

// 🔥 장바구니 API 응답용 (CartPage와 동일 구조만 사용)
interface CartItemForCheckout {
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

// ===== 백엔드 CreateGoodsOrderReq 1:1 매칭 =====
interface CreateGoodsOrderReq {
    itemId?: number | null;
    quantity?: number;
    cartItemIds?: number[];

    cartNo: number;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverDetailAddress: string;
    receiverZipCode: string;
    memo?: string;
}

// ===== 백엔드 CreateOrderReq (type + payload) 매칭 =====
type ItemCategoryType = "MD" | "MEMBERSHIP" | "POP";

interface CreateOrderReq<TPayload> {
    type: ItemCategoryType;
    payload: TPayload;
}

// TossPayments 타입
type TossPayType = "CARD" | "TRANSFER";

interface TossRequestBase {
    amount: number;
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
}

interface TossClient {
    requestPayment: (method: TossPayType, params: TossRequestBase) => Promise<void>;
}

interface TossWindow extends Window {
    TossPayments?: (clientKey: string) => TossClient;
}

// 회원 정보 응답
interface MemberMeRes {
    memberName: string;
    memberEmail: string;
}

// 상품 상세 응답
interface ItemDetailRes {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    thumbnailUrl?: string | null;
    description?: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const formatPrice = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const extractError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError<ErrorBody>(err)) {
        const ax = err as AxiosError<ErrorBody>;
        return ax.response?.data?.resMessage || ax.response?.data?.message || fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
};

const getTossClient = (): TossClient | null => {
    if (typeof window === "undefined") return null;
    const w = window as TossWindow;
    if (!w.TossPayments) return null;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
    if (!clientKey) return null;
    return w.TossPayments(clientKey);
};

// ✅ 체크아웃 이미지 URL 정규화 (카트와 동일 원리)
function toCheckoutImgSrc(raw?: string | null): string | null {
    if (!raw) return null;
    const url = raw.trim();
    if (!url) return null;

    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    // /files 는 백엔드로 붙이기 (한글 파일명 안전)
    if (url.startsWith("/files")) return encodeURI(`${API_BASE}${url}`);

    // 기타 상대경로도 안전 처리
    return encodeURI(url.startsWith("/") ? url : `/${url}`);
}

// ===== 페이지 컴포넌트 =====
export default function GoodsCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // URL 파라미터 기반 단건 주문 (itemNo, quantity)
    const [itemId, setItemId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // 🔥 장바구니로 들어온 경우 선택된 cartNo 목록
    const [cartItemIds, setCartItemIds] = useState<number[]>([]);

    const [data, setData] = useState<CheckoutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");

    const [goodsForm, setGoodsForm] = useState<GoodsForm>({
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
        receiverDetailAddress: "",
        receiverZipCode: "",
        memo: "",
    });

    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreePaymentTerms, setAgreePaymentTerms] = useState(false);
    const [agreeAll, setAgreeAll] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 약관 동기화
    useEffect(() => {
        if (agreeAll) {
            setAgreePrivacy(true);
            setAgreePaymentTerms(true);
        }
    }, [agreeAll]);

    useEffect(() => {
        if (agreePrivacy && agreePaymentTerms) setAgreeAll(true);
        else setAgreeAll(false);
    }, [agreePrivacy, agreePaymentTerms]);

    const canPay = !!data && agreePrivacy && agreePaymentTerms && !isSubmitting;

    // 1) 마운트 시 URL 파라미터 파싱 + 주문자/상품 정보 로드
    useEffect(() => {
        const cartNosParam = searchParams.get("cartNos");
        const parsedCartNos =
            cartNosParam
                ?.split(",")
                .map((v) => Number(v))
                .filter((n) => !Number.isNaN(n)) ?? [];

        const itemNoParam = searchParams.get("itemNo");
        const qtyParam = searchParams.get("quantity");

        const parsedItemId = itemNoParam ? Number(itemNoParam) : null;
        const parsedQty = qtyParam ? Number(qtyParam) : 1;

        setItemId(parsedItemId);
        setQuantity(parsedQty > 0 ? parsedQty : 1);

        const load = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                // ✅ 1) cartNos 있는 경우: 장바구니 기반 결제
                if (parsedCartNos.length > 0) {
                    const memberRes = await apiClient.get<ApiResult<MemberMeRes>>("/member/readOne");
                    if (!memberRes.data.isSuccess) {
                        throw new Error(memberRes.data.resMessage || "회원 정보를 불러오지 못했습니다.");
                    }
                    const member = memberRes.data.result;

                    const cartRes = await apiClient.get<ApiResult<CartItemForCheckout[]>>("/cart");
                    if (!cartRes.data.isSuccess) {
                        throw new Error(cartRes.data.resMessage || "장바구니 정보를 불러오지 못했습니다.");
                    }

                    const cartItems = cartRes.data.result ?? [];
                    const selected = cartItems.filter((ci) => parsedCartNos.includes(ci.cartNo));

                    if (selected.length === 0) throw new Error("선택한 장바구니 상품이 없습니다.");

                    const items: CheckoutItem[] = selected.map((ci) => ({
                        itemNo: ci.itemNo,
                        imageUrl: ci.thumbnail, // ✅ 원본은 그대로 두고, 렌더에서 변환
                        title: ci.itemName,
                        subtitle: ci.optionLabel,
                        description: null,
                        price: ci.unitPrice,
                        quantity: ci.quantity,
                    }));

                    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

                    setCartItemIds(parsedCartNos);
                    setData({
                        buyerName: member.memberName,
                        buyerEmail: member.memberEmail,
                        items,
                        totalAmount,
                    });
                    return;
                }

                // ✅ 2) 단건구매
                if (!parsedItemId) throw new Error("주문할 상품 정보가 없습니다.");

                const memberRes = await apiClient.get<ApiResult<MemberMeRes>>("/member/readOne");
                if (!memberRes.data.isSuccess) {
                    throw new Error(memberRes.data.resMessage || "회원 정보를 불러오지 못했습니다.");
                }
                const member = memberRes.data.result;

                const itemRes = await apiClient.get<ApiResult<ItemDetailRes>>(`/item/${parsedItemId}`);
                if (!itemRes.data.isSuccess) {
                    throw new Error(itemRes.data.resMessage || "상품 정보를 불러오지 못했습니다.");
                }
                const it = itemRes.data.result;

                const items: CheckoutItem[] = [
                    {
                        itemNo: it.itemNo,
                        imageUrl: it.thumbnailUrl ?? null,
                        title: it.itemName,
                        subtitle: null,
                        description: it.description ?? null,
                        price: it.itemPrice,
                        quantity: parsedQty > 0 ? parsedQty : 1,
                    },
                ];

                const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

                setData({
                    buyerName: member.memberName,
                    buyerEmail: member.memberEmail,
                    items,
                    totalAmount,
                });
            } catch (err) {
                setErrorMsg(extractError(err, "결제 정보를 불러오지 못했습니다."));
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [searchParams]);

    // ===== 폼 입력 =====
    const handleGoodsChange = (field: keyof GoodsForm, value: string) => {
        setGoodsForm((prev) => ({ ...prev, [field]: value }));
    };

    const validateGoodsForm = (): string | null => {
        if (!goodsForm.receiverName.trim()) return "받는 분 이름을 입력해 주세요.";
        if (!goodsForm.receiverPhone.trim()) return "전화번호를 입력해 주세요.";
        if (!/^[0-9\-]{9,13}$/.test(goodsForm.receiverPhone.trim())) {
            return "전화번호는 숫자/하이픈 포함 9~13자리로 입력해 주세요.";
        }
        if (!goodsForm.receiverZipCode.trim()) return "우편번호를 입력해 주세요.";
        if (!goodsForm.receiverAddress.trim()) return "주소를 입력해 주세요.";
        if (!goodsForm.receiverDetailAddress.trim()) return "상세 주소를 입력해 주세요.";
        return null;
    };

    // ===== 주문 생성 =====
    const createGoodsOrder = async (): Promise<number> => {
        if (!data) throw new Error("결제 데이터가 없습니다.");
        if (!itemId && cartItemIds.length === 0) throw new Error("상품 정보가 없습니다.");

        const err = validateGoodsForm();
        if (err) throw new Error(err);

        const payload: CreateGoodsOrderReq = {
            cartNo: 0,
            receiverName: goodsForm.receiverName,
            receiverPhone: goodsForm.receiverPhone,
            receiverAddress: goodsForm.receiverAddress,
            receiverDetailAddress: goodsForm.receiverDetailAddress,
            receiverZipCode: goodsForm.receiverZipCode,
            ...(goodsForm.memo.trim() ? { memo: goodsForm.memo } : {}),
        };

        if (cartItemIds.length > 0) {
            payload.cartItemIds = cartItemIds;
        } else {
            payload.itemId = itemId;
            payload.quantity = quantity;
        }

        const body: CreateOrderReq<CreateGoodsOrderReq> = { type: "MD", payload };

        const res = await apiClient.post<ApiResult<CreateOrderRes>>("/order/goods", body);
        if (!res.data.isSuccess) throw new Error(res.data.resMessage || "주문 생성에 실패했습니다.");
        return res.data.result.orderNo;
    };

    // ===== Toss prepare =====
    const prepareToss = async (orderNo: number): Promise<TossPrepareResponse["data"]> => {
        const method = paymentMethod === "ACCOUNT" ? "ACCOUNT" : "CARD";
        try {
            const res = await apiClient.post<TossPrepareResponse>("/api/pay/toss/prepare", { orderNo, method });
            if (!res.data.isSuccess) throw new Error(res.data.resMessage || "Toss 결제 준비에 실패했습니다.");
            return res.data.data;
        } catch (err) {
            throw new Error(extractError(err, "Toss 결제 준비 중 오류가 발생했습니다."));
        }
    };

    // ===== 결제 버튼 =====
    const handlePay = async () => {
        if (!canPay) {
            alert("필수 약관에 동의해 주세요.");
            return;
        }
        if (!data) return;

        try {
            setIsSubmitting(true);

            const orderNo = await createGoodsOrder();
            const prepared = await prepareToss(orderNo);

            const tossClient = getTossClient();
            if (!tossClient) {
                alert("Toss 스크립트 또는 클라이언트 키가 없습니다.");
                return;
            }

            const payType: TossPayType = paymentMethod === "ACCOUNT" ? "TRANSFER" : "CARD";

            const base: TossRequestBase = {
                amount: prepared.amount,
                orderId: prepared.orderId,
                orderName: prepared.orderName,
                successUrl: `${window.location.origin}/toss/success`,
                failUrl: `${window.location.origin}/toss/fail`,
                customerEmail: data.buyerEmail,
                customerName: data.buyerName,
            };

            await tossClient.requestPayment(payType, base);
        } catch (err) {
            alert(err instanceof Error ? err.message : "결제 요청 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== UI =====
    return (
        <div className="w-full min-h-screen bg-black text-white">
            <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
                <h1 className="text-3xl font-semibold mb-8">결제하기</h1>

                {loading && <div className="text-sm text-neutral-400">결제 정보를 불러오는 중입니다…</div>}
                {errorMsg && <div className="text-sm text-red-400 mb-4">{errorMsg}</div>}

                {data && (
                    <div className="flex flex-col gap-8">
                        {/* 주문자 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm text-neutral-400 mb-1">주문자</div>
                                    <div className="text-lg font-semibold">{data.buyerName}</div>
                                    <div className="text-xs text-neutral-400 mt-1">{data.buyerEmail}</div>
                                </div>
                                <button
                                    className="px-4 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg hover:bg-neutral-800"
                                    onClick={() => router.push("/mypage/edit")}
                                >
                                    변경
                                </button>
                            </div>
                        </section>

                        {/* 배송 정보 */}
                        <section className="border-t border-neutral-800 pt-6 text-xs">
                            <div className="text-sm text-neutral-400 mb-3">배송 정보</div>

                            <div className="flex flex-col gap-3">
                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        받는 분 이름 <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverName}
                                        onChange={(e) => handleGoodsChange("receiverName", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        전화번호 <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        placeholder="숫자와 하이픈(-)만 입력"
                                        value={goodsForm.receiverPhone}
                                        onChange={(e) => handleGoodsChange("receiverPhone", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        우편번호 <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverZipCode}
                                        onChange={(e) => handleGoodsChange("receiverZipCode", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        주소 <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverAddress}
                                        onChange={(e) => handleGoodsChange("receiverAddress", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">
                                        상세 주소 <span className="text-red-500">(필수)</span>
                                    </div>
                                    <input
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                                        value={goodsForm.receiverDetailAddress}
                                        onChange={(e) => handleGoodsChange("receiverDetailAddress", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-neutral-300">요청 사항</div>
                                    <textarea
                                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm h-16 resize-none"
                                        value={goodsForm.memo}
                                        onChange={(e) => handleGoodsChange("memo", e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 주문 상품 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-4">주문 상품</div>
                            <div className="flex flex-col gap-4">
                                {data.items.map((item) => {
                                    const imgSrc = toCheckoutImgSrc(item.imageUrl);
                                    return (
                                        <div key={item.itemNo} className="flex gap-4">
                                            <div className="w-24 h-32 bg-neutral-900 rounded-lg flex items-center justify-center text-[11px] text-neutral-500 overflow-hidden">
                                                {imgSrc ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={imgSrc}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <>이미지</>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="text-sm font-semibold">{item.title}</div>
                                                    {item.subtitle && <div className="text-xs text-neutral-400 mt-0.5">{item.subtitle}</div>}
                                                    {item.description && (
                                                        <div className="text-xs text-neutral-500 mt-0.5">{item.description}</div>
                                                    )}
                                                </div>
                                                <div className="mt-2 text-sm font-semibold">
                                                    {formatPrice(item.price)}{" "}
                                                    <span className="ml-1 text-xs text-neutral-500">x {item.quantity}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 결제 금액 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm font-semibold mb-2">결제 금액</div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-neutral-400">총 결제 금액</span>
                                <span className="text-2xl font-semibold">{formatPrice(data.totalAmount)}</span>
                            </div>
                        </section>

                        {/* 결제 수단 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <div className="text-sm text-neutral-400 mb-4">결제</div>
                            <div className="flex flex-col gap-3 text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="accent-red-500"
                                        checked={paymentMethod === "CARD"}
                                        onChange={() => setPaymentMethod("CARD")}
                                    />
                                    <span>TOSS PAYMENTS</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-neutral-500">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="accent-red-500"
                                        checked={paymentMethod === "ACCOUNT"}
                                        onChange={() => setPaymentMethod("ACCOUNT")}
                                    />
                                    <span>
                    Eximbay
                    <span className="ml-1 text-[11px] text-neutral-500"> - 원화(KRW)로만 결제 가능합니다.</span>
                  </span>
                                </label>
                            </div>
                        </section>

                        {/* 약관 + 결제 버튼 */}
                        <section className="border-t border-neutral-800 pt-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer mb-4">
                                <input
                                    type="checkbox"
                                    className="accent-red-500"
                                    checked={agreeAll}
                                    onChange={(e) => setAgreeAll(e.target.checked)}
                                />
                                <span>주문 내용과 약관에 동의합니다.</span>
                            </label>

                            <button
                                className="w-full mt-2 h-12 rounded-xl bg-[#f04923] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e03f19]"
                                disabled={!canPay}
                                onClick={handlePay}
                            >
                                {isSubmitting ? "결제 진행 중..." : "결제하기"}
                            </button>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
