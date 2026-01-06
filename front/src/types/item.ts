// src/types/item.ts

// 카테고리
export type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";

// 판매 상태 (백엔드 enum 다 모르니까 string fallback 유지)
export type ItemSellStatus = "ON_SALE" | "SOLD_OUT" | "HIDDEN" | string;

// 🔥 백엔드 SearchAllItemRes 와 맞춘 요약 타입
export interface ItemSummary {
    itemNo: number;
    itemName: string;
    itemPrice: number;     // BigDecimal → number
    itemStock: number;
    itemCategory: ItemCategory;
    itemSellStatus: ItemSellStatus;

    // 🔥 여기 꼭 있어야 함 (optional 로)
    thumbnailUrl?: string | null;

    // 백에서 보내고 있으면 써먹을 수 있게 예약
    membershipOnly?: boolean;
    popPlanType?: string | null;
}
