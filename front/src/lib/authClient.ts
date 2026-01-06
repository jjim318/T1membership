// src/lib/authClient.ts
"use client";

import { apiClient } from "@/lib/apiClient";

export async function logout() {
    if (typeof window === "undefined") return;

    const refreshToken = localStorage.getItem("refreshToken");

    try {
        await apiClient.post("/auth/logout", {
            refreshToken,    // 🔥 백엔드 TokenReq.getRefreshToken()에 맞춰서
        });
    } catch (e) {
        console.error("[logout] 서버 로그아웃 실패 (무시 가능)", e);
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("memberEmail");
    window.dispatchEvent(new Event("loginStateChange"));

    window.location.href = "/login";
}
