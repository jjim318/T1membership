// src/app/shop/[itemNo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

import {
    ApiResult,
    DetailImage,
    ExistingImageDTO,
    ItemDetail,
} from "./_components/types";

import MDDetail from "./_components/MDDetail";
import PopDetail from "./_components/PopDetail";
import MembershipDetail from "./_components/MembershipDetail";

// ✅ API Base
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * ✅ 이미지 URL 정규화 규칙
 * - 절대URL(http/https) 그대로
 * - /files/**  → API_BASE 붙여서 반환
 * - files/**   → API_BASE 붙여서 반환
 * - 파일명만 오는 경우(한글/공백 포함) → /files/{encodeURIComponent(fileName)}
 * - 그 외 이상한 경로도 파일명만 뽑아 /files로 강제 보정
 */
function toImageSrc(raw?: string | null, context = "Detail"): string {
    if (!raw) return "";

    const url = raw.trim();
    if (!url) return "";

    // 1) 절대 URL
    if (/^https?:\/\//i.test(url)) return url;

    // 2) /files/**
    if (url.startsWith("/files/")) return `${API_BASE}${url}`;
    if (url === "/files") return `${API_BASE}/files`;

    // 3) files/**
    if (url.startsWith("files/")) return `${API_BASE}/${url}`;

    // 4) 파일명만 오는 케이스 (공백/한글 OK)
    if (!url.includes("/")) {
        return `${API_BASE}/files/${encodeURIComponent(url)}`;
    }

    // 5) 그 외(/shop/** 같은 과거값) → 파일명만 뽑아서 /files로 강제 보정
    console.warn(`[${context}] 예상치 못한 경로 → /files로 강제 보정:`, url);
    const fileName = url.split("/").pop();
    if (!fileName) return "";
    return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
}

export default function ShopDetailPage() {
    const params = useParams<{ itemNo: string }>();
    const itemNo = Number(params?.itemNo);

    const [item, setItem] = useState<ItemDetail | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
    const [detailImages, setDetailImages] = useState<DetailImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!itemNo || Number.isNaN(itemNo)) {
            setErrorMsg("잘못된 상품 번호입니다.");
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                setErrorMsg(null);
                setLoading(true);

                // ✅ (형님 현재 코드 유지) item 상세 조회
                const res = await apiClient.get<ApiResult<ItemDetail>>(`/item/${itemNo}`);
                const data = res.data.result;

                setItem(data);

                // ✅ 이미지 정렬 (data.images 기준)
                const sortedImages = [...(data.images ?? [])].sort(
                    (a: ExistingImageDTO, b: ExistingImageDTO) =>
                        (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
                );

                // ✅ 썸네일 (0번)
                const rawThumb = sortedImages[0]?.fileName ?? null;
                const thumb = toImageSrc(rawThumb, "Thumbnail");
                setThumbnailUrl(thumb);

                // ✅ 상세 이미지: 멤버십만 0번 포함, 나머지는 0번 제외 (형님 로직 유지)
                const isMembership = data.itemCategory === "MEMBERSHIP";
                const detailSource = isMembership ? sortedImages : sortedImages.slice(1);

                const mapped: DetailImage[] = detailSource
                    .map((img, idx) => {
                        const raw = img.fileName ?? (img as any).url ?? null;

                        // ⚠️ DetailImage 타입이 { url, sortOrder } 중심이면 안전하게 맞춤
                        return {
                            url: toImageSrc(raw, `DetailImage#${idx + 1}`),
                            sortOrder: img.sortOrder ?? idx,
                        } as DetailImage;
                    })
                    // ✅ url이 빈 값이면 제외
                    .filter((img) => !!img.url);

                setDetailImages(mapped);
            } catch (e) {
                console.error(e);
                setErrorMsg("상품 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [itemNo]);

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

    // ✅ 카테고리 분기
    if (item.itemCategory === "MEMBERSHIP") {
        return <MembershipDetail item={item} detailImages={detailImages} />;
    }

    if (item.itemCategory === "POP") {
        return (
            <PopDetail
                item={item}
                detailImages={detailImages}
                thumbnailUrl={thumbnailUrl}
            />
        );
    }

    // ✅ 기본 MD
    return (
        <MDDetail item={item} detailImages={detailImages} thumbnailUrl={thumbnailUrl} />
    );
}
