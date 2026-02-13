// src/lib/itemApi.ts
import { apiClient } from "@/lib/apiClient";
import { ApiResult, PageResponse } from "@/types/common";
import { ItemSummary, ItemCategory } from "@/types/item";

export interface SearchItemsParams {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "ASC" | "DESC";
    itemCategory?: ItemCategory;
    popPlayer?: string;
}

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== "undefined"
        ? window.location.origin.replace(":3000", ":8080")
        : "");

export function toImageSrc(url?: string | null): string {
    if (!url) return "/shop/placeholder.png";

    if (/^https?:\/\//i.test(url)) return url;

    if (url.startsWith("/files/")) {
        const base = (API_BASE || "").replace(/\/+$/, "");
        return `${base}${url}`;
    }

    if (url.startsWith("/shop/")) return url;

    return url;
}

export async function fetchItems(params: SearchItemsParams = {}) {
    const {
        page = 0,
        size = 12,
        sortBy = "itemNo",
        direction = "DESC",
        itemCategory = "ALL",
        popPlayer,
    } = params;

    const res = await apiClient.get<ApiResult<PageResponse<ItemSummary>>>(
        "/item",
        {
            params: {
                page,
                size,
                sortBy,
                direction,
                itemCategory,
                popPlayer,
            },
        }
    );

    // 🔥 형님 프로젝트는 result 가 아니라 data 사용!
    const pageData = res.data.data; // ← 여기!

    if (!pageData || !Array.isArray(pageData.dtoList)) {
        return pageData;
    }

    const mapped: PageResponse<ItemSummary> = {
        ...pageData,
        dtoList: pageData.dtoList.map((item) => ({
            ...item,
            thumbnailUrl: toImageSrc(item.thumbnailUrl ?? undefined),
        })),
    };

    return mapped;
}
