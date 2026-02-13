// src/components/admin/AdminGuard.tsx
"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// =====================
// JWT 유틸 타입/함수
// =====================

interface JwtPayload {
    sub?: string;
    roles?: string[];        // ["USER","ADMIN"] 형태
    memberRole?: string;     // "ADMIN" 형태로 들어갈 수도 있음
    [key: string]: unknown;  // ✅ any → unknown 으로 변경
}

/**
 * accessToken 의 payload 부분을 파싱해서 객체로 반환
 */
function parseJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) {
            console.error("[AdminGuard] JWT 형식이 잘못되었습니다.");
            return null;
        }

        const payload = parts[1];
        // base64url → base64 변환
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

        const decoded =
            typeof window !== "undefined"
                ? window.atob(base64)
                : Buffer.from(base64, "base64").toString("binary");

        const json = decodeURIComponent(
            decoded
                .split("")
                .map((c) => {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(json) as JwtPayload;
    } catch (e) {
        console.error("[AdminGuard] JWT 파싱 실패", e);
        return null;
    }
}

/**
 * 토큰이 ADMIN 권한을 가지고 있는지 여부
 */
function isAdminToken(token: string | null): boolean {
    if (!token) return false;

    const payload = parseJwt(token);
    if (!payload) return false;

    const roles: string[] = payload.roles ?? [];
    const singleRole = payload.memberRole ?? "";

    return roles.includes("ADMIN") ||
           singleRole === "ADMIN"  ||
           roles.includes("ADMIN_CONTENT") ||
           singleRole === "ADMIN_CONTENT";
}

// =====================
// AdminGuard 컴포넌트
// =====================

export default function AdminGuard({ children }: { children: ReactNode }) {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        const verify = () => {
            if (typeof window === "undefined") return;

            const token = localStorage.getItem("accessToken");

            // 토큰 없으면 로그인 페이지로
            if (!token) {
                router.replace("/login");
                return;
            }

            // JWT payload 에서 ADMIN 권한 체크
            const admin = isAdminToken(token);

            if (!admin) {
                // 관리자 아니면 홈으로 튕김
                router.replace("/");
                return;
            }

            setAllowed(true);
        };

        verify();
        setChecking(false);
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                관리자 확인 중...
            </div>
        );
    }

    if (!allowed) return null;

    return <>{children}</>;
}
