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
    popPlayer?: string; // enum Player 문자열 (필요하면)
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

    // res.data: ApiResult< PageResponse<ItemSummary> >
    // res.data.data: PageResponse<ItemSummary>
    return res.data.data;
}
