// src/app/shop/[itemNo]/_components/types.ts
"use client";

// ===== 공통 타입 =====
export type ItemCategory = "MD" | "MEMBERSHIP" | "POP" | "ALL";
export type ItemSellStatus = "SELL" | "SOLD_OUT" | string;
export type MembershipPayType =
    | "ONE_TIME"
    | "YEARLY"
    | "RECURRING"
    | "NO_MEMBERSHIP";

export interface ExistingImageDTO {
    fileName: string;
    sortOrder: number | null;
}

export type DetailImage = ExistingImageDTO & { url: string };

export interface ItemDetail {
    itemNo: number;
    itemName: string;
    itemPrice: number;
    itemStock: number;
    itemCategory: ItemCategory;
    itemSellStatus: ItemSellStatus;
    membershipPayType: MembershipPayType;
    images?: ExistingImageDTO[]; // page.tsx에서만 사용
}

export interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// /member/readOne 응답
export interface MemberReadOneRes {
    memberEmail: string;
    membershipType: MembershipPayType;
}

// ===== 옵션 관련 =====
export type OptionKind = "SIZE" | "PLAYER" | "QTY_ONLY";

export type SizeOption = {
    value: string;
    label: string;
    price: number;
    soldOut: boolean;
};

export type PlayerOption = {
    value: string;
    label: string;
    price: number;
    soldOut: boolean;
};

// ===== POP 전용 =====
export type PopPassCount = 1 | 2 | 3 | 4 | 5;

export const POP_PASS_LABELS: Record<PopPassCount, string> = {
    1: "1인권",
    2: "2인권",
    3: "3인권",
    4: "4인권",
    5: "5인권",
};

export const POP_PASS_PRICES_NON_MEMBER: Record<PopPassCount, number> = {
    1: 5500,
    2: 10000,
    3: 14500,
    4: 19000,
    5: 23500,
};

export const POP_PASS_PRICES_MEMBER: Record<PopPassCount, number> = {
    1: 4400,
    2: 8000,
    3: 11600,
    4: 15200,
    5: 18800,
};

export type PopPlayerOption = {
    value: string;
    label: string;
};

export const POP_PLAYER_OPTIONS: PopPlayerOption[] = [
    { value: "DORAN", label: "Doran" },
    { value: "KERIA", label: "Keria" },
    { value: "GUMAYUSI", label: "Gumayusi" },
    { value: "FAKER", label: "Faker" },
    { value: "ONER", label: "Oner" },
];

export const POP_PLAYER_IMAGES: Record<string, string> = {
    FAKER: "http://localhost:8080/files/faker.png",
    ONER: "http://localhost:8080/files/oner.png",
    DORAN: "http://localhost:8080/files/doran.png",
    GUMAYUSI: "http://localhost:8080/files/gumayusi.png",
    KERIA: "http://localhost:8080/files/keria.png",
};

// ===== 상품별 옵션 테이블 (현 구조 그대로 유지) =====
export const OPTION_KIND_TABLE: Record<number, OptionKind> = {
    1: "SIZE", // 저지
    2: "PLAYER", // 선수 인형
    3: "QTY_ONLY", // 티켓 홀더
    // 필요하면 추가
};

export const SIZE_TABLE: Record<number, SizeOption[]> = {
    1: [
        { value: "S", label: "S", price: 189000, soldOut: false },
        { value: "M", label: "M", price: 189000, soldOut: true },
        { value: "L", label: "L", price: 189000, soldOut: false },
        { value: "XL", label: "XL", price: 189000, soldOut: false },
        { value: "2XL", label: "2XL", price: 189000, soldOut: false },
    ],
};

export const PLAYER_TABLE: Record<number, PlayerOption[]> = {
    2: [
        { value: "DORAN", label: "DORAN", price: 25000, soldOut: true },
        { value: "ONER", label: "ONER", price: 25000, soldOut: true },
        { value: "FAKER", label: "FAKER", price: 25000, soldOut: true },
        { value: "GUMAYUSI", label: "GUMAYUSI", price: 25000, soldOut: true },
        { value: "KERIA", label: "KERIA", price: 25000, soldOut: true },
        { value: "SMASH", label: "SMASH", price: 25000, soldOut: false },
    ],
};

// ===== JWT 유틸 =====

// accessToken 에서 이메일(sub or memberEmail) 추출
export function extractEmailFromJwt(token: string | null): string | null {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payloadPart.padEnd(
            Math.ceil(payloadPart.length / 4) * 4,
            "=",
        );
        const json = atob(padded);
        const payload = JSON.parse(json);

        return payload.sub ?? payload.memberEmail ?? null;
    } catch (e) {
        console.error("JWT decode 실패 =", e);
        return null;
    }
}

// JWT(accessToken)에서 membershipType 추출
export function getMembershipTypeFromClient(): MembershipPayType | null {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const payloadPart = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payloadPart.padEnd(
            Math.ceil(payloadPart.length / 4) * 4,
            "=",
        );
        const json = atob(padded);
        const payload = JSON.parse(json);

        const mt = payload.membershipType as string | undefined;
        if (
            mt === "ONE_TIME" ||
            mt === "YEARLY" ||
            mt === "RECURRING" ||
            mt === "NO_MEMBERSHIP"
        ) {
            return mt as MembershipPayType;
        }
        return null;
    } catch (e) {
        console.error("JWT membershipType 파싱 실패 =", e);
        return null;
    }
}
