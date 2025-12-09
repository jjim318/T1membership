// src/app/admin/items/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// ====== 공통 타입 ======
type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";
type ItemSellStatus = "SELL" | "SOLDOUT" | string;
type PopPlanType = "GENERAL" | "MEMBERSHIP_ONLY" | string;

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface PageResponse<T> {
    dtoList: T[];
    total: number;
    page: number;
    size: number;
    start: number;
    end: number;
    prev: boolean;
    next: boolean;
}

interface ItemSummary {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: "MD" | "MEMBERSHIP" | "POP" | "ALL";
    itemSellStatus: ItemSellStatus;

    thumbnailUrl?: string | null;
    membershipOnly?: boolean;
    popPlanType?: PopPlanType;
}

interface ItemFormData {
    itemNo?: number;
    itemName: string;
    itemCategory: "MD" | "MEMBERSHIP" | "POP";
    itemPrice: number;
    itemStock: number;
    itemSellStatus: "SELL" | "SOLDOUT";
    membershipOnly: boolean;
    popPlanType?: PopPlanType;
    description?: string;
    thumbnailUrl?: string | null;
}

function formatPrice(value: number) {
    return value.toLocaleString("ko-KR") + "원";
}

export default function AdminItemsPage() {
    const router = useRouter();

    const [items, setItems] = useState<ItemSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 오른쪽 수정 폼용
    const [form, setForm] = useState<ItemFormData | null>(null);
    const [saving, setSaving] = useState(false);

    const loadItems = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            const params = {
                page: 0,
                size: 100,
                sortBy: "itemNo",
                direction: "DESC",
                itemCategory: "ALL" as ItemCategory,
            };

            const res = await apiClient.get<ApiResult<PageResponse<ItemSummary>>>(
                "/item",
                { params }
            );

            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage);
            }

            setItems(res.data.result.dtoList);
        } catch (e) {
            console.error("[AdminItems] loadItems error:", e);
            setErrorMsg("상품 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    // 목록의 [수정] 클릭 → 단건 조회 후 폼 세팅
    const handleEditClick = async (itemNo: number) => {
        try {
            setSaving(true);

            const res = await apiClient.get<ApiResult<ItemFormData>>(
                `/item/${itemNo}`
            );
            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage);
            }

            const data = res.data.result;

            setForm({
                itemNo: data.itemNo,
                itemName: data.itemName,
                itemCategory: data.itemCategory,
                itemPrice: data.itemPrice,
                itemStock: data.itemStock,
                itemSellStatus: data.itemSellStatus as "SELL" | "SOLDOUT",
                membershipOnly: data.membershipOnly ?? false,
                popPlanType: data.popPlanType,
                description: data.description ?? "",
                thumbnailUrl: data.thumbnailUrl ?? null,
            });
        } catch (e) {
            console.error("[AdminItems] handleEditClick error:", e);
            alert("상품 정보를 불러오지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = async (itemNo: number) => {
        if (!confirm(`정말로 상품 번호 ${itemNo} 를 삭제하시겠습니까?`)) return;

        try {
            await apiClient.delete(`/admin/items/${itemNo}`);
            setItems((prev) => prev.filter((i) => i.itemNo !== itemNo));

            // 삭제한 상품이 현재 수정 중이면 폼 비움
            setForm((prev) => (prev?.itemNo === itemNo ? null : prev));

            alert("상품이 삭제되었습니다.");
        } catch (e) {
            console.error("[AdminItems] handleDeleteClick error:", e);
            alert("상품 삭제에 실패했습니다.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form || !form.itemNo) return;

        try {
            setSaving(true);

            const body = {
                itemName: form.itemName,
                itemCategory: form.itemCategory,
                itemPrice: form.itemPrice,
                itemStock: form.itemStock,
                itemSellStatus: form.itemSellStatus,
                membershipOnly: form.membershipOnly,
                popPlanType:
                    form.itemCategory === "POP" ? form.popPlanType : undefined,
                description: form.description,
                thumbnailUrl: form.thumbnailUrl,
            };

            const res = await apiClient.put<ApiResult<void>>(
                `/admin/items/${form.itemNo}`,
                body
            );

            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage);
            }

            alert("상품 정보가 수정되었습니다.");
            await loadItems();
        } catch (e) {
            console.error("[AdminItems] handleSubmit error:", e);
            alert("상품 수정 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => setForm(null);

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
                {/* 상단 헤더 */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold">상품 수정 / 삭제</h1>
                        <p className="text-xs text-zinc-400">
                            좌측에서 상품을 선택하여 정보를 수정하거나 삭제할 수 있습니다.
                        </p>
                    </div>

                    {/* 등록 페이지로 이동 */}
                    <button
                        onClick={() => router.push("/admin/items/new")}
                        className="rounded-full border border-amber-400 px-5 py-2 text-xs font-semibold text-amber-300 hover:border-amber-300 hover:text-amber-200"
                    >
                        신규 상품 등록
                    </button>
                </div>

                {/* 에러/로딩 */}
                {loading && (
                    <div className="text-sm text-zinc-400">
                        상품 목록을 불러오는 중입니다...
                    </div>
                )}
                {errorMsg && (
                    <div className="text-sm text-red-400">{errorMsg}</div>
                )}

                <div className="grid gap-8 lg:grid-cols-[2fr,1.2fr]">
                    {/* 왼쪽: 상품 목록 테이블 */}
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">상품 목록</h2>
                            <span className="text-xs text-zinc-500">
                                총 {items.length}개
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[960px] text-left text-xs">
                                <thead className="border-b border-zinc-800 text-[11px] uppercase text-zinc-500">
                                <tr>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        NO
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        썸네일
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        상품명
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        카테고리
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        멤버십
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        POP 플랜
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        가격
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        재고
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap">
                                        상태
                                    </th>
                                    <th className="px-3 py-2 whitespace-nowrap text-right">
                                        관리
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={10}
                                            className="px-3 py-6 text-center text-xs text-zinc-500"
                                        >
                                            등록된 상품이 없습니다.
                                        </td>
                                    </tr>
                                )}

                                {items.map((item) => (
                                    <tr
                                        key={item.itemNo}
                                        className="border-b border-zinc-900/60 hover:bg-zinc-900/40"
                                    >
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-500 whitespace-nowrap">
                                            {item.itemNo}
                                        </td>
                                        <td className="px-3 py-2 align-middle whitespace-nowrap">
                                            <div className="relative h-10 w-10 overflow-hidden rounded-md bg-zinc-900">
                                                <Image
                                                    src={
                                                        item.thumbnailUrl ||
                                                        "/shop/placeholder.png"
                                                    }
                                                    alt={item.itemName}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 align-middle max-w-[260px]">
                                            <div className="truncate text-[11px]">
                                                {item.itemName}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300 whitespace-nowrap">
                                            {item.itemCategory}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] whitespace-nowrap">
                                            {item.membershipOnly ? (
                                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                                                        멤버십 전용
                                                    </span>
                                            ) : (
                                                <span className="text-zinc-500">
                                                        일반
                                                    </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300 whitespace-nowrap">
                                            {item.itemCategory === "POP"
                                                ? item.popPlanType || "-"
                                                : "-"}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300 whitespace-nowrap">
                                            {formatPrice(item.itemPrice)}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300 whitespace-nowrap">
                                            {item.itemStock}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] whitespace-nowrap">
                                            {item.itemSellStatus === "SOLDOUT" ? (
                                                <span className="rounded-full border border-red-500/60 px-2 py-0.5 text-[10px] text-red-400">
                                                        품절
                                                    </span>
                                            ) : (
                                                <span className="rounded-full border border-emerald-500/60 px-2 py-0.5 text-[10px] text-emerald-400">
                                                        판매중
                                                    </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-right text-[11px] whitespace-nowrap">
                                            <button
                                                onClick={() =>
                                                    handleEditClick(item.itemNo)
                                                }
                                                className="mr-1 rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] hover:border-zinc-300"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDeleteClick(item.itemNo)
                                                }
                                                className="rounded-full border border-red-500/60 px-2 py-0.5 text-[10px] text-red-400 hover:border-red-400"
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 오른쪽: 수정 폼 */}
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <h2 className="text-sm font-semibold">상품 수정</h2>
                        {!form && (
                            <p className="mt-3 text-xs text-zinc-500">
                                좌측 목록에서 수정할 상품의{" "}
                                <span className="font-semibold text-zinc-300">
                                    [수정]
                                </span>{" "}
                                버튼을 눌러주세요.
                            </p>
                        )}

                        {form && (
                            <form
                                onSubmit={handleSubmit}
                                className="mt-4 space-y-3 text-xs"
                            >
                                <p className="text-[11px] text-zinc-500">
                                    상품 번호 #{form.itemNo}
                                </p>

                                {/* 상품명 */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        상품명
                                    </label>
                                    <input
                                        type="text"
                                        value={form.itemName}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        itemName: e.target.value,
                                                    }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                        required
                                    />
                                </div>

                                {/* 카테고리 / POP 플랜 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] text-zinc-400">
                                            카테고리
                                        </label>
                                        <select
                                            value={form.itemCategory}
                                            onChange={(e) => {
                                                const value =
                                                    e.target.value as ItemFormData["itemCategory"];
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            itemCategory: value,
                                                            popPlanType:
                                                                value === "POP"
                                                                    ? prev.popPlanType
                                                                    : undefined,
                                                        }
                                                        : prev
                                                );
                                            }}
                                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                        >
                                            <option value="MD">MD (일반 상품)</option>
                                            <option value="MEMBERSHIP">
                                                MEMBERSHIP
                                            </option>
                                            <option value="POP">POP</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[11px] text-zinc-400">
                                            POP 플랜 타입
                                        </label>
                                        <select
                                            value={form.popPlanType ?? ""}
                                            onChange={(e) =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            popPlanType:
                                                                e.target
                                                                    .value as PopPlanType,
                                                        }
                                                        : prev
                                                )
                                            }
                                            disabled={form.itemCategory !== "POP"}
                                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none disabled:cursor-not-allowed disabled:bg-zinc-900 focus:border-amber-400"
                                        >
                                            <option value="">
                                                {form.itemCategory === "POP"
                                                    ? "선택하세요"
                                                    : "POP 상품이 아닙니다"}
                                            </option>
                                            <option value="GENERAL">
                                                GENERAL (일반 POP)
                                            </option>
                                            <option value="MEMBERSHIP_ONLY">
                                                MEMBERSHIP_ONLY (멤버십 전용 POP)
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                {/* 멤버십 전용 여부 */}
                                <div className="flex items-center gap-2">
                                    <input
                                        id="membershipOnly"
                                        type="checkbox"
                                        checked={form.membershipOnly}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        membershipOnly:
                                                        e.target.checked,
                                                    }
                                                    : prev
                                            )
                                        }
                                        className="h-3 w-3 rounded border-zinc-700 bg-black text-amber-400"
                                    />
                                    <label
                                        htmlFor="membershipOnly"
                                        className="text-[11px] text-zinc-300"
                                    >
                                        멤버십 전용 상품으로 설정
                                    </label>
                                </div>

                                {/* 가격 / 재고 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] text-zinc-400">
                                            가격 (원)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.itemPrice}
                                            onChange={(e) =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            itemPrice:
                                                                Number(
                                                                    e.target.value
                                                                ) || 0,
                                                        }
                                                        : prev
                                                )
                                            }
                                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[11px] text-zinc-400">
                                            재고 수량
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.itemStock}
                                            onChange={(e) =>
                                                setForm((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            itemStock:
                                                                Number(
                                                                    e.target.value
                                                                ) || 0,
                                                        }
                                                        : prev
                                                )
                                            }
                                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 판매 상태 */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        판매 상태
                                    </label>
                                    <select
                                        value={form.itemSellStatus}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        itemSellStatus:
                                                            e.target
                                                                .value as "SELL" | "SOLDOUT",
                                                    }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                    >
                                        <option value="SELL">SELL (판매중)</option>
                                        <option value="SOLDOUT">SOLDOUT (품절)</option>
                                    </select>
                                </div>

                                {/* 썸네일 URL */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        썸네일 이미지 URL
                                    </label>
                                    <input
                                        type="text"
                                        value={form.thumbnailUrl ?? ""}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        thumbnailUrl:
                                                            e.target.value || null,
                                                    }
                                                    : prev
                                            )
                                        }
                                        placeholder="/files/xxx.png 형태 또는 절대경로"
                                        className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                    />
                                    {form.thumbnailUrl && (
                                        <div className="mt-2 flex items-center gap-3">
                                            <div className="relative h-12 w-12 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                                                <Image
                                                    src={form.thumbnailUrl}
                                                    alt="thumbnail preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <span className="text-[11px] text-zinc-500">
                                                썸네일 미리보기
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 상세 설명 */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        상품 설명
                                    </label>
                                    <textarea
                                        value={form.description ?? ""}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        description:
                                                        e.target.value,
                                                    }
                                                    : prev
                                            )
                                        }
                                        rows={4}
                                        className="w-full resize-none rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                        placeholder="상품 상세 설명을 입력하세요."
                                    />
                                </div>

                                {/* 버튼 */}
                                <div className="mt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-full border border-zinc-600 px-4 py-1.5 text-[11px] text-zinc-300 hover:border-zinc-300"
                                    >
                                        선택 해제
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-full border border-amber-400 px-6 py-1.5 text-[11px] font-semibold text-amber-300 hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving ? "저장 중..." : "수정 저장"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>

                <div className="pt-4 text-right">
                    <button
                        onClick={() => router.push("/shop")}
                        className="text-[11px] text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
                    >
                        ← 쇼핑 메인으로 돌아가기
                    </button>
                </div>
            </main>
        </div>
    );
}
