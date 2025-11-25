// src/types/item.ts
export type ItemCategory = "ALL" | "MD" | "MEMBERSHIP" | "POP";

export type ItemSellStatus = "ON_SALE" | "SOLD_OUT" | "HIDDEN" | string;
// enum 전체값 모르니까 일단 string fallback

export interface ItemSummary {
    itemNo: number;
    itemName: string;
    itemPrice: number;     // BigDecimal → JSON으로 오면 number
    itemStock: number;
    itemCategory: ItemCategory;
    itemSellStatus: ItemSellStatus;
}
