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

// ===== 이미지 변환 헬퍼 (files / 절대 URL만 허용) =====
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function toImageSrc(raw?: string | null): string {
    if (!raw) return "";

    const url = raw.trim();

    // 절대 URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    // 백엔드 /files/**  → API_BASE 붙임
    if (url.startsWith("/files")) {
        return `${API_BASE}${url}`;
    }

    // 그 외(/shop/** 포함)는 전부 버림
    console.warn("[Detail] 이미지는 /files/** 또는 절대 URL만 허용합니다. 잘못된 경로 =", url);
    return "";
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

                const res = await apiClient.get<ApiResult<ItemDetail>>(
                    `/item/${itemNo}`,
                );

                const data = res.data.result;
                setItem(data);

                // 이미지 정렬
                const sortedImages = [...(data.images ?? [])].sort(
                    (a: ExistingImageDTO, b: ExistingImageDTO) =>
                        (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
                );

                // ===== 썸네일 =====
                const rawThumb = sortedImages[0]?.fileName ?? null;
                const thumb = toImageSrc(rawThumb);
                setThumbnailUrl(thumb);

                // ===== 상세 이미지 =====
                const isMembership = data.itemCategory === "MEMBERSHIP";

                const detailSource = isMembership
                    ? sortedImages        // 멤버십: 0번 포함
                    : sortedImages.slice(1); // 그 외: 0번 제외

                const mapped: DetailImage[] = detailSource
                    .map((img) => ({
                        ...img,
                        url: toImageSrc(img.fileName),
                    }))
                    // url 비어있는 애들 제거 (/shop/** 같은 옛날 값)
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

    // 카테고리 분기
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

    // 기본 MD
    return (
        <MDDetail
            item={item}
            detailImages={detailImages}
            thumbnailUrl={thumbnailUrl}
        />
    );
}
