"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// ==========================
//  공통 타입
// ==========================
type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";
type ItemSellStatus = "SELL" | "SOLDOUT" | string;
type PopPlanType = "GENERAL" | "MEMBERSHIP_ONLY" | string;

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: string;
    resMessage: string | null;
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

interface ExistingImageDTO {
    fileName: string;
    sortOrder: number | null;
    url?: string | null; // 백엔드 ExistingImageDTO.url
}

interface ExistingImage {
    fileName: string;
    sortOrder: number;
    url: string; // 프론트에서 사용할 최종 URL(원본: /shop/... or /files/...)
}

interface ItemSummary {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: "MD" | "MEMBERSHIP" | "POP" | "ALL";
    itemSellStatus: ItemSellStatus;

    // 목록 썸네일용
    thumbnailUrl?: string | null;
    membershipOnly?: boolean;
    popPlanType?: PopPlanType;
}

// 단건 조회 응답 (SearchOneItemRes 기준)
interface ItemDetailRes {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: "MD" | "MEMBERSHIP" | "POP";
    itemSellStatus: "SELL" | "SOLDOUT";

    // DB 에서 내려오는 이미지들 (상세용)
    images: ExistingImageDTO[];
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

    // 썸네일 / 상세 이미지들
    thumbnailExisting?: ExistingImage | null; // 기존 썸네일 (선택된 한 장)
    detailExisting: ExistingImage[]; // 기존 상세 이미지들
    thumbnailFile?: File | null; // 새 썸네일
    detailFiles: File[]; // 새 상세 이미지들
}

// ==========================
//  이미지 URL 처리 관련
// ==========================

// 백엔드 API 베이스 (이미지용)
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== "undefined"
        ? window.location.origin.replace(":3000", ":8080")
        : "");

// UUID처럼 보이는 파일명인지 체크 (업로드된 /files/ 전용 구분용)
function looksLikeUuidFileName(name: string): boolean {
    const onlyName = name.split("/").pop() || "";
    const base = onlyName.split("?")[0].split(".")[0]; // 확장자/쿼리 제거
    const parts = base.split("-");
    // 대충 UUID v4 형태: 8-4-4-4-12 같은 패턴
    return parts.length === 5 && parts.every((p) => p.length > 0);
}

// 최종적으로 <Image src={...}> 에 들어가는 값
function toImageSrc(url?: string | null): string {
    if (!url) {
        // 완전 없으면 placeholder
        return "/shop/placeholder.png";
    }

    // 이미 절대 URL 이면 그대로 사용
    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    // 1) /shop/ 로 시작 → public 폴더 이미지
    if (url.startsWith("/shop/")) {
        return url;
    }

    // 2) /files/ 로 시작 → 업로드 이미지 or 실수로 잘못 저장된 정적 이미지
    if (url.startsWith("/files/")) {
        const filename = url.split("/").pop() || "";
        // 파일명이 UUID처럼 안 보이면, 이건 정적이미지인데 prefix만 잘못 들어간 경우로 보고 /shop/ 으로 보정
        if (!looksLikeUuidFileName(filename)) {
            return `/shop/${filename}`;
        }
        // 진짜 업로드 이미지는 백엔드(8080)에서 받아야 함
        const base = (API_BASE || "").replace(/\/+$/, "");
        return `${base}${url}`;
    }

    // 3) 아무 prefix도 없는 경우 → 정적이미지로 보고 /shop/ 으로 보정
    if (!url.startsWith("/")) {
        return `/shop/${url}`;
    }

    // 4) 기타 이상한 케이스 → 일단 있는 그대로 써 보고, 안 뜨면 나중에 로그로 잡는다
    return url;
}

function mapExistingDtoToImage(dto: ExistingImageDTO, idx: number): ExistingImage {
    return {
        fileName: dto.fileName,
        sortOrder: dto.sortOrder ?? idx,
        url: dto.url ?? "", // 원본 url (/shop/... or /files/...)
    };
}

// ==========================
//  컴포넌트 본문
// ==========================
export default function AdminItemsPage() {
    const router = useRouter();

    const [items, setItems] = useState<ItemSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [form, setForm] = useState<ItemFormData | null>(null);
    const [saving, setSaving] = useState(false);

    // --------------------------
    // 상품 목록 로드
    // --------------------------
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
                throw new Error(res.data.resMessage || "목록 조회 실패");
            }

            // 썸네일 URL 이 없다면, 일단 그대로 두고 렌더에서 toImageSrc가 보정하게 둔다
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

    // --------------------------
    // 수정 클릭 → 단건 조회
    // --------------------------
    const handleEditClick = async (itemNo: number) => {
        try {
            setSaving(true);

            const res = await apiClient.get<ApiResult<ItemDetailRes>>(
                `/item/${itemNo}`
            );
            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage || "단건 조회 실패");
            }

            const data = res.data.result;
            const existingImages = (data.images || []).map(mapExistingDtoToImage);

            // 편의상: 첫 번째 이미지를 썸네일로, 나머지는 상세로 사용
            const [first, ...rest] = existingImages;

            setForm({
                itemNo: data.itemNo,
                itemName: data.itemName,
                itemCategory: data.itemCategory,
                itemPrice: data.itemPrice,
                itemStock: data.itemStock,
                itemSellStatus: data.itemSellStatus,
                membershipOnly: false, // 필요하면 SearchOneItemRes 에 필드 추가해서 채우기
                popPlanType: undefined,

                thumbnailExisting: first ?? null,
                detailExisting: rest,
                thumbnailFile: null,
                detailFiles: [],
            });
        } catch (e) {
            console.error("[AdminItems] handleEditClick error:", e);
            alert("상품 정보를 불러오지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // --------------------------
    // 삭제
    // --------------------------
    const handleDeleteClick = async (itemNo: number) => {
        if (!confirm(`정말로 상품 번호 ${itemNo} 를 삭제하시겠습니까?`)) return;

        try {
            await apiClient.delete(`/admin/items/${itemNo}`);
            setItems((prev) => prev.filter((i) => i.itemNo !== itemNo));
            setForm((prev) => (prev?.itemNo === itemNo ? null : prev));
            alert("상품이 삭제되었습니다.");
        } catch (e) {
            console.error("[AdminItems] handleDeleteClick error:", e);
            alert("상품 삭제에 실패했습니다.");
        }
    };

    // --------------------------
    // 썸네일 / 상세 이미지 입력 핸들러
    // --------------------------
    const handleThumbFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files?.[0] ?? null;
        setForm((prev) =>
            prev ? { ...prev, thumbnailFile: file } : prev
        );
    };

    const handleDetailFilesChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setForm((prev) =>
            prev ? { ...prev, detailFiles: [...prev.detailFiles, ...files] } : prev
        );
        e.target.value = "";
    };

    const handleRemoveExistingDetail = (idx: number) => {
        setForm((prev) =>
            prev
                ? {
                    ...prev,
                    detailExisting: prev.detailExisting.filter((_, i) => i !== idx),
                }
                : prev
        );
    };

    const handleRemoveNewDetail = (idx: number) => {
        setForm((prev) =>
            prev
                ? {
                    ...prev,
                    detailFiles: prev.detailFiles.filter((_, i) => i !== idx),
                }
                : prev
        );
    };

    // 썸네일 미리보기
    const thumbPreview = useMemo(() => {
        if (!form) return "";
        if (form.thumbnailFile) {
            return URL.createObjectURL(form.thumbnailFile);
        }
        if (form.thumbnailExisting) {
            return toImageSrc(form.thumbnailExisting.url);
        }
        return "";
    }, [form]);

    // --------------------------
    // 수정 저장 (multipart/form-data + 기존/새 이미지 함께)
    // --------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form || !form.itemNo) return;

        try {
            setSaving(true);

            // 백엔드 ModifyItemReq 에 맞춰서 필드 구성
            const json: any = {
                itemNo: form.itemNo,
                itemName: form.itemName,
                itemPrice: form.itemPrice,
                itemStock: form.itemStock,
                itemCategory: form.itemCategory,
                itemSellStatus: form.itemSellStatus,
                // membershipOnly, popPlanType 필요하면 서버 DTO 에 추가해서 같이 넘기기
            };

            // 기존 유지할 이미지 정보 (fileName + sortOrder)
            // - 썸네일도 결국 ItemEntity.images 중 하나이므로 기존 이미지 중에 포함되어 있을 것
            const keepExisting = [
                ...(form.thumbnailExisting ? [form.thumbnailExisting] : []),
                ...form.detailExisting,
            ];

            const existingImagesPayload = keepExisting.map((img, idx) => ({
                fileName: img.fileName,
                sortOrder: img.sortOrder ?? idx,
            }));

            const fd = new FormData();
            fd.append(
                "putReq",
                new Blob([JSON.stringify(json)], { type: "application/json" })
            );

            // 새 썸네일 → 그냥 newImages 쪽으로 같이 보내서 서버에서 sortOrder 로 썸네일/상세 구분해도 되고,
            // 또는 별도 파라미터로 보낸 뒤 서버에서 썸네일 플래그를 두어도 됨.
            if (form.thumbnailFile) {
                fd.append("images", form.thumbnailFile);
            }

            // 새 상세 이미지들
            form.detailFiles.forEach((file) => {
                fd.append("images", file);
            });

            // 기존 이미지 목록
            fd.append(
                "existingImages",
                new Blob([JSON.stringify(existingImagesPayload)], {
                    type: "application/json",
                })
            );

            const res = await apiClient.put<ApiResult<any>>(
                `/item/${form.itemNo}`,
                fd,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (!res.data.isSuccess) {
                throw new Error(res.data.resMessage || "수정 실패");
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

    // ==========================
    //  렌더링
    // ==========================
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

                    <button
                        onClick={() => router.push("/admin/items/new")}
                        className="rounded-full border border-amber-400 px-5 py-2 text-xs font-semibold text-amber-300 hover:border-amber-300 hover:text-amber-200"
                    >
                        신규 상품 등록
                    </button>
                </div>

                {/* 에러/로딩 */}
                {loading && (
                    <div className="text-sm text-zinc-400">상품 목록을 불러오는 중입니다...</div>
                )}
                {errorMsg && (
                    <div className="text-sm text-red-400">{errorMsg}</div>
                )}

                <div className="grid gap-8 lg:grid-cols-[2fr,1.3fr]">
                    {/* 왼쪽: 상품 목록 */}
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">상품 목록</h2>
                            <span className="text-xs text-zinc-500">총 {items.length}개</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[960px] text-left text-xs">
                                <thead className="border-b border-zinc-800 text-[11px] uppercase text-zinc-500">
                                <tr>
                                    <th className="px-3 py-2">NO</th>
                                    <th className="px-3 py-2">썸네일</th>
                                    <th className="px-3 py-2">상품명</th>
                                    <th className="px-3 py-2">카테고리</th>
                                    <th className="px-3 py-2">가격</th>
                                    <th className="px-3 py-2">재고</th>
                                    <th className="px-3 py-2">상태</th>
                                    <th className="px-3 py-2 text-right">관리</th>
                                </tr>
                                </thead>
                                <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
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
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-500">
                                            {item.itemNo}
                                        </td>
                                        <td className="px-3 py-2 align-middle">
                                            <div className="relative h-10 w-10 overflow-hidden rounded-md bg-zinc-900">
                                                <Image
                                                    src={toImageSrc(item.thumbnailUrl || null)}
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
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300">
                                            {item.itemCategory}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300">
                                            {item.itemPrice.toLocaleString("ko-KR")}원
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px] text-zinc-300">
                                            {item.itemStock}
                                        </td>
                                        <td className="px-3 py-2 align-middle text-[11px]">
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
                                        <td className="px-3 py-2 align-middle text-right text-[11px]">
                                            <button
                                                onClick={() => handleEditClick(item.itemNo)}
                                                className="mr-1 rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] hover:border-zinc-300"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(item.itemNo)}
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
                                <span className="font-semibold text-zinc-300">[수정]</span>{" "}
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
                                                prev ? { ...prev, itemName: e.target.value } : prev
                                            )
                                        }
                                        className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                        required
                                    />
                                </div>

                                {/* 카테고리 */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        카테고리
                                    </label>
                                    <select
                                        value={form.itemCategory}
                                        onChange={(e) =>
                                            setForm((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        itemCategory: e.target
                                                            .value as ItemFormData["itemCategory"],
                                                    }
                                                    : prev
                                            )
                                        }
                                        className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                                    >
                                        <option value="MD">MD</option>
                                        <option value="MEMBERSHIP">MEMBERSHIP</option>
                                        <option value="POP">POP</option>
                                    </select>
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
                                                            itemPrice: Number(e.target.value || 0),
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
                                                            itemStock: Number(e.target.value || 0),
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
                                                        itemSellStatus: e.target
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

                                {/* 썸네일 */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        썸네일 이미지
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-16 w-16 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                                            {thumbPreview ? (
                                                <Image
                                                    src={thumbPreview}
                                                    alt="thumbnail"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                                                    없음
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleThumbFileChange}
                                            className="text-[11px]"
                                        />
                                    </div>
                                    <p className="mt-1 text-[10px] text-zinc-500">
                                        새 파일을 선택하면 기존 썸네일을 교체합니다.
                                    </p>
                                </div>

                                {/* 상세 이미지들 */}
                                <div className="space-y-1">
                                    <label className="block text-[11px] text-zinc-400">
                                        상세 이미지
                                    </label>

                                    {/* 기존 상세 */}
                                    {form.detailExisting.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {form.detailExisting.map((img, idx) => (
                                                <div
                                                    key={`${img.fileName}-${idx}`}
                                                    className="space-y-1"
                                                >
                                                    <div className="relative h-20 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                                                        <Image
                                                            src={toImageSrc(img.url)}
                                                            alt={img.fileName}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExistingDetail(idx)}
                                                        className="w-full rounded-full border border-red-500/60 px-2 py-0.5 text-[10px] text-red-400 hover:border-red-400"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-zinc-500">
                                            등록된 상세 이미지가 없습니다.
                                        </p>
                                    )}

                                    {/* 신규 상세 추가 */}
                                    <div className="mt-2 space-y-1">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleDetailFilesChange}
                                            className="text-[11px]"
                                        />
                                        {form.detailFiles.length > 0 && (
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                {form.detailFiles.map((file, idx) => {
                                                    const url = URL.createObjectURL(file);
                                                    return (
                                                        <div
                                                            key={`${file.name}-${idx}`}
                                                            className="space-y-1"
                                                        >
                                                            <div className="relative h-20 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                                                                <Image
                                                                    src={url}
                                                                    alt={file.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveNewDetail(idx)}
                                                                className="w-full rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] hover:border-zinc-300"
                                                            >
                                                                제거
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p className="mt-1 text-[10px] text-zinc-500">
                                            여러 장을 한 번에 선택할 수 있습니다.
                                        </p>
                                    </div>
                                </div>

                                {/* 버튼 영역 */}
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
