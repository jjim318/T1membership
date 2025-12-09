// src/app/shop/[itemNo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import Image from "next/image";

import {
    ApiResult,
    DetailImage,
    ExistingImageDTO,
    ItemDetail,
} from "./_components/types";
import MDDetail from "./_components/MDDetail";
import PopDetail from "./_components/PopDetail";
import MembershipDetail from "./_components/MembershipDetail";

export default function ShopDetailPage() {
    const params = useParams<{ itemNo: string }>();
    const itemNo = Number(params?.itemNo);

    const [item, setItem] = useState<ItemDetail | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string>("/shop/placeholder.png");
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
                setLoading(true);
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<ItemDetail>>(
                    `/item/${itemNo}`,
                );

                const data = res.data.result;
                setItem(data);

                const sortedImages = [...(data.images ?? [])].sort(
                    (a: ExistingImageDTO, b: ExistingImageDTO) =>
                        (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
                );

                const rawThumb = sortedImages[0]?.fileName ?? "/shop/placeholder.png";
                const thumb =
                    rawThumb.startsWith("http") || rawThumb.startsWith("/")
                        ? rawThumb
                        : `/${rawThumb}`;
                setThumbnailUrl(thumb);

                const isMembershipItem = data.itemCategory === "MEMBERSHIP";

                const detailSource = isMembershipItem
                    ? sortedImages // 멤버십은 0번 포함
                    : sortedImages.slice(1); // 나머지는 0번 제외

                const mapped: DetailImage[] = detailSource.map((img) => {
                    const raw = img.fileName;
                    const url =
                        raw.startsWith("http") || raw.startsWith("/")
                            ? raw
                            : `/${raw}`;
                    return { ...img, url };
                });

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

    // 기본: MD / 일반 상품
    return (
        <MDDetail
            item={item}
            detailImages={detailImages}
            thumbnailUrl={thumbnailUrl}
        />
    );
}
