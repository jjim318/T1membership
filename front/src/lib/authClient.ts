// src/lib/authClient.ts
"use client";

import { apiClient } from "@/lib/apiClient";
import axios from "axios";

export async function logout() {
    if (typeof window === "undefined") return;

    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    try {
        await apiClient.post("/auth/logout", {
            accessToken,
            refreshToken,
        });
    } catch (e) {
        console.error("[logout] 서버 로그아웃 실패 (무시 가능)", e);
        // 실패해도 프론트 쪽은 그냥 토큰 지우고 나가버리면 됨
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("loginStateChange"));

    // 원하면 메인으로
    window.location.href = "/";
}
