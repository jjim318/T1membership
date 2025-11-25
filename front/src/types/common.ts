// src/types/common.ts
export interface PageResponse<T> {
    page: number;
    size: number;
    total: number;
    start: number;
    end: number;
    prev: boolean;
    next: boolean;
    dtoList: T[];
}

export interface ApiResult<T> {
    data: T;
    message?: string;
}
