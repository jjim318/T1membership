// src/app/admin/items/new/page.tsx
"use client";

import { useState, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";

// ===== 타입 정의 =====
type ItemCategory = "MD" | "MEMBERSHIP" | "POP";
type ItemSellStatus = "SELL" | "SOLDOUT";
type PopPlanType = "GENERAL" | "MEMBERSHIP_ONLY" | string;

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 🔥 파일 업로드 응답 (백엔드 스펙에 맞게 수정 가능)
interface FileUploadRes {
    fileUrl: string; // 예: "/files/uuid.png"
}

// 상품 등록 폼 데이터
interface ItemFormData {
    itemName: string;
    itemCategory: ItemCategory;
    itemPrice: number;
    itemStock: number;
    itemSellStatus: ItemSellStatus;
    membershipOnly: boolean;
    popPlanType?: PopPlanType;
    description?: string;

    thumbnailUrl?: string | null; // 썸네일 이미지 URL
    detailImageUrls: string[]; // 상세 이미지 URL 리스트
}

// ===== 유틸: 파일 업로드 공통 함수 =====
async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<ApiResult<FileUploadRes>>(
        "/files", // 🔥 형님 파일 업로드 엔드포인트에 맞게 수정
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        }
    );

    if (!res.data.isSuccess) {
        throw new Error(res.data.resMessage || "파일 업로드 실패");
    }

    return res.data.result.fileUrl; // 백엔드에서 내려주는 URL
}

export default function AdminItemNewPage() {
    const router = useRouter();

    const [form, setForm] = useState<ItemFormData>({
        itemName: "",
        itemCategory: "MD",
        itemPrice: 0,
        itemStock: 0,
        itemSellStatus: "SELL",
        membershipOnly: false,
        popPlanType: undefined,
        description: "",
        thumbnailUrl: null,
        detailImageUrls: [],
    });

    const [saving, setSaving] = useState(false);
    const [thumbUploading, setThumbUploading] = useState(false);
    const [detailUploading, setDetailUploading] = useState(false);

    // input 클릭용 ref (썸네일 / 상세 각각)
    const thumbInputRef = useRef<HTMLInputElement | null>(null);
    const detailInputRef = useRef<HTMLInputElement | null>(null);

    const isBusy = saving || thumbUploading || detailUploading;

    // ===== 썸네일 업로드 =====
    const handleThumbnailFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];

        try {
            setThumbUploading(true);
            const url = await uploadFile(file);
            setForm((prev) => ({
                ...prev,
                thumbnailUrl: url,
            }));
        } catch (e) {
            console.error("[AdminItemNew] thumbnail upload error:", e);
            alert("썸네일 업로드 중 오류가 발생했습니다.");
        } finally {
            setThumbUploading(false);
        }
    };

    const handleThumbnailDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        await handleThumbnailFiles(files);
    };

    // ===== 상세 이미지 업로드 =====
    const handleDetailFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        try {
            setDetailUploading(true);
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const url = await uploadFile(file);
                uploadedUrls.push(url);
            }

            setForm((prev) => ({
                ...prev,
                detailImageUrls: [...prev.detailImageUrls, ...uploadedUrls],
            }));
        } catch (e) {
            console.error("[AdminItemNew] detail upload error:", e);
            alert("상세 이미지 업로드 중 오류가 발생했습니다.");
        } finally {
            setDetailUploading(false);
        }
    };

    const handleDetailDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        await handleDetailFiles(files);
    };

    const preventDefault = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // ===== 저장 =====
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (thumbUploading || detailUploading) {
            alert("이미지 업로드가 끝난 뒤에 저장해 주세요.");
            return;
        }

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
                detailImageUrls: form.detailImageUrls, // 🔥 상세 이미지들 함께 전송
            };

            const res = await apiClient.post<ApiResult<{ itemNo: number }>>(
                "/admin/items",
                body
            );

            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage);
            }

            alert("신규 상품이 등록되었습니다.");
            router.push("/admin/items");
        } catch (e) {
            console.error("[AdminItemNew] handleSubmit error:", e);
            alert("상품 등록 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
                {/* 상단 헤더 */}
                <div className="space-y-1">
                    <h1 className="text-xl font-bold">신규 상품 등록</h1>
                    <p className="text-xs text-zinc-400">
                        썸네일과 상세 이미지를 업로드하여 새 상품을 등록할 수 있습니다.
                    </p>
                </div>

                {/* 폼 */}
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-3 text-xs"
                    >
                        {/* 상품명 */}
                        <div className="space-y-1">
                            <label className="block text-[11px] text-zinc-400">
                                상품명
                            </label>
                            <input
                                type="text"
                                value={form.itemName}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        itemName: e.target.value,
                                    }))
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
                                            e.target.value as ItemCategory;
                                        setForm((prev) => ({
                                            ...prev,
                                            itemCategory: value,
                                            popPlanType:
                                                value === "POP"
                                                    ? prev.popPlanType
                                                    : undefined,
                                        }));
                                    }}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                >
                                    <option value="MD">MD (일반 상품)</option>
                                    <option value="MEMBERSHIP">MEMBERSHIP</option>
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
                                        setForm((prev) => ({
                                            ...prev,
                                            popPlanType:
                                                e.target.value as PopPlanType,
                                        }))
                                    }
                                    disabled={form.itemCategory !== "POP"}
                                    className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none disabled:cursor-not-allowed disabled:bg-zinc-900 focus:border-amber-400"
                                >
                                    <option value="">
                                        {form.itemCategory === "POP"
                                            ? "선택하세요"
                                            : "POP 상품이 아닙니다"}
                                    </option>
                                    <option value="GENERAL">GENERAL (일반 POP)</option>
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
                                    setForm((prev) => ({
                                        ...prev,
                                        membershipOnly: e.target.checked,
                                    }))
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
                                        setForm((prev) => ({
                                            ...prev,
                                            itemPrice:
                                                Number(e.target.value) || 0,
                                        }))
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
                                        setForm((prev) => ({
                                            ...prev,
                                            itemStock:
                                                Number(e.target.value) || 0,
                                        }))
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
                                    setForm((prev) => ({
                                        ...prev,
                                        itemSellStatus:
                                            e.target.value as ItemSellStatus,
                                    }))
                                }
                                className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                            >
                                <option value="SELL">SELL (판매중)</option>
                                <option value="SOLDOUT">SOLDOUT (품절)</option>
                            </select>
                        </div>

                        {/* 썸네일 업로드 (드래그&드롭) */}
                        <div className="space-y-1">
                            <label className="block text-[11px] text-zinc-400">
                                썸네일 이미지
                            </label>
                            <div
                                onDragOver={preventDefault}
                                onDragEnter={preventDefault}
                                onDrop={handleThumbnailDrop}
                                className="relative flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-600 bg-black/40 px-4 py-6 text-center text-[11px] text-zinc-400 hover:border-amber-400"
                                onClick={() => thumbInputRef.current?.click()}
                            >
                                <input
                                    ref={thumbInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                        handleThumbnailFiles(e.target.files)
                                    }
                                />
                                <p className="font-medium text-zinc-300">
                                    썸네일 이미지를 드래그앤드롭 하거나 클릭해서 선택하세요.
                                </p>
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    권장: 1장 / 상품 목록에서 사용됩니다.
                                </p>
                                {thumbUploading && (
                                    <p className="mt-2 text-[10px] text-amber-300">
                                        썸네일 업로드 중...
                                    </p>
                                )}
                                {form.thumbnailUrl && !thumbUploading && (
                                    <div className="mt-3 flex items-center justify-center gap-2">
                                        <div className="relative h-16 w-16 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                                            <Image
                                                src={form.thumbnailUrl}
                                                alt="thumbnail preview"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <span className="text-[10px] text-zinc-500">
                                            현재 썸네일
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 상세 이미지 업로드 (드래그&드롭) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-[11px] text-zinc-400">
                                    상세 이미지 (상품 설명 영역)
                                </label>
                            </div>

                            <div
                                onDragOver={preventDefault}
                                onDragEnter={preventDefault}
                                onDrop={handleDetailDrop}
                                className="relative flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-600 bg-black/40 px-4 py-6 text-center text-[11px] text-zinc-400 hover:border-amber-400"
                                onClick={() => detailInputRef.current?.click()}
                            >
                                <input
                                    ref={detailInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) =>
                                        handleDetailFiles(e.target.files)
                                    }
                                />
                                <p className="font-medium text-zinc-300">
                                    상세 이미지를 여러 장 드래그앤드롭 하거나 클릭해서 선택하세요.
                                </p>
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    업로드 순서대로 상세 페이지 하단에 노출됩니다.
                                </p>
                                {detailUploading && (
                                    <p className="mt-2 text-[10px] text-amber-300">
                                        상세 이미지 업로드 중...
                                    </p>
                                )}
                            </div>

                            {/* 상세 이미지 프리뷰 리스트 */}
                            {form.detailImageUrls.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {form.detailImageUrls.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 rounded-md border border-zinc-700 bg-black px-3 py-2"
                                        >
                                            <span className="w-8 text-[11px] text-zinc-500">
                                                #{idx + 1}
                                            </span>
                                            <div className="relative h-12 w-12 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                                                <Image
                                                    src={url}
                                                    alt={`detail-${idx + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 truncate text-[11px] text-zinc-400">
                                                {url}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        detailImageUrls:
                                                            prev.detailImageUrls.filter(
                                                                (_, i) =>
                                                                    i !== idx
                                                            ),
                                                    }))
                                                }
                                                className="rounded-full border border-red-500/70 px-2 py-0.5 text-[10px] text-red-400 hover:border-red-400"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 상세 설명 (텍스트, 선택) */}
                        <div className="space-y-1">
                            <label className="block text-[11px] text-zinc-400">
                                부가 설명 (선택)
                            </label>
                            <textarea
                                value={form.description ?? ""}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                rows={3}
                                className="w-full resize-none rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                placeholder="텍스트 설명이 필요하면 입력, 아니면 이미지로만 구성해도 됩니다."
                            />
                        </div>

                        {/* 버튼 */}
                        <div className="mt-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => router.push("/admin/items")}
                                className="text-[11px] text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
                                disabled={isBusy}
                            >
                                ← 목록으로
                            </button>

                            <button
                                type="submit"
                                disabled={isBusy}
                                className="rounded-full border border-amber-400 px-6 py-1.5 text-[11px] font-semibold text-amber-300 hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isBusy ? "처리 중..." : "상품 등록"}
                            </button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
