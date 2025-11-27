// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

interface MemberInfo {
    profileImageUrl?: string | null;
}

// =====================
// JWT 유틸
// =====================

interface JwtPayload {
    sub?: string;
    roles?: string[];        // ["USER","ADMIN"]
    memberRole?: string;     // "ADMIN" 같은 단일 스트링일 수도 있음
    [key: string]: unknown;
}

function parseJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("[Header] JWT 파싱 실패", e);
        return null;
    }
}

function isAdminToken(token: string | null): boolean {
    if (!token) return false;
    const payload = parseJwt(token);
    if (!payload) return false;

    const roles: string[] = payload.roles ?? [];
    const single = payload.memberRole ?? "";

    return roles.includes("ADMIN") || single === "ADMIN";
}

// =====================
// Header 컴포넌트
// =====================

export default function Header() {
    const router = useRouter();

    const [isLogin, setIsLogin] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [cartCount, setCartCount] = useState<number>(0);
    const [hasNotification, setHasNotification] = useState<boolean>(false);

    const checkLogin = () => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        const loggedIn = !!token;

        setIsLogin(loggedIn);
        setIsAdmin(isAdminToken(token));
    };

    const resetLoginRelatedState = () => {
        setProfileImageUrl(null);
        setCartCount(0);
        setHasNotification(false);
    };

    const loadLoginRelatedInfo = async () => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        if (!token) {
            resetLoginRelatedState();
            return;
        }

        try {
            const memberRes = await apiClient.get("/member/readOne");
            const memberData: MemberInfo =
                memberRes.data?.result ?? memberRes.data?.data ?? {};

            setProfileImageUrl(memberData.profileImageUrl ?? null);

            // 아직 백엔드 연동 전이므로 임시
            setCartCount(0);
            setHasNotification(false);
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem("accessToken");
                setIsLogin(false);
                setIsAdmin(false);
                resetLoginRelatedState();
                return;
            }
            console.error("[Header] loadLoginRelatedInfo 실패", e);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const sync = () => {
            checkLogin();

            const token = localStorage.getItem("accessToken");
            if (!token) {
                resetLoginRelatedState();
                return;
            }

            void loadLoginRelatedInfo();
        };

        sync();

        window.addEventListener("loginStateChange", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("loginStateChange", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    const handleProtectedClick = (path: string) => {
        if (!isLogin) {
            router.push("/login");
            return;
        }
        router.push(path);
    };

    return (
        <header
            className="
                fixed top-0 left-0 right-0 z-50
                bg-black/90 text-white backdrop-blur-sm
                border-b border-zinc-800
            "
        >
            <div className="mx-auto max-w-6xl px-3 md:px-6 h-14 flex items-center justify-between gap-3">
                {/* 왼쪽: 로고 + 메뉴 */}
                <div className="flex items-center gap-4 min-w-0">
                    <Link href="/public" className="flex items-center gap-2 shrink-0">
                        <Image
                            src="/icons/t1.png"
                            alt="T1 Logo"
                            width={32}
                            height={32}
                            className="cursor-pointer"
                        />
                        <span className="text-xs md:text-sm font-semibold tracking-[0.2em] text-red-400">
                            T1 MEMBERSHIP
                        </span>
                    </Link>

                    <nav
                        className="
                            hidden lg:flex
                            flex-wrap items-center
                            gap-x-4 gap-y-1
                            text-[11px] xl:text-sm text-zinc-300
                        "
                    >
                        <Link href="/public" className="hover:text-white">
                            HOME
                        </Link>
                        <Link href="/story" className="hover:text-white">
                            STORY
                        </Link>
                        <Link href="/content" className="hover:text-white">
                            CONTENT
                        </Link>
                        <Link href="/community" className="hover:text-white">
                            COMMUNITY
                        </Link>
                        <Link href="/shop" className="hover:text-white">
                            SHOP
                        </Link>
                        <Link href="/pop" className="hover:text-red-400">
                            POP
                        </Link>
                    </nav>
                </div>

                {/* 오른쪽: 아이콘들 */}
                <div className="flex items-center gap-3 md:gap-5 text-white shrink-0">

                    {/* 🔥 ADMIN 버튼 (종 왼쪽) */}
                    {isLogin && isAdmin && (
                        <button
                            onClick={() => router.push("/admin")}
                            className="
                                px-3 py-[4px]
                                rounded-full border border-red-500
                                text-[10px] md:text-xs
                                hover:bg-red-500/10
                            "
                        >
                            ADMIN
                        </button>
                    )}

                    {/* 🔔 알림 */}
                    <button
                        onClick={() => handleProtectedClick("/notifications")}
                        className="relative"
                    >
                        <Image
                            src="/icons/bell.png"
                            alt="알림"
                            width={22}
                            height={22}
                        />
                        {isLogin && hasNotification && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                        )}
                    </button>

                    {/* 📅 캘린더 */}
                    <button onClick={() => handleProtectedClick("/schedule")}>
                        <Image
                            src="/icons/calendar.png"
                            alt="캘린더"
                            width={22}
                            height={22}
                        />
                    </button>

                    {/* 🛒 장바구니 */}
                    <button
                        onClick={() => handleProtectedClick("/cart")}
                        className="relative"
                    >
                        <Image
                            src="/icons/cart.png"
                            alt="장바구니"
                            width={24}
                            height={24}
                        />
                        {isLogin && cartCount > 0 && (
                            <span className="
                                absolute -top-1 -right-1
                                min-w-[18px] h-[18px] px-[4px]
                                rounded-full bg-red-500
                                text-[11px] font-semibold
                                flex items-center justify-center
                            ">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    {/* 🙍 프로필 */}
                    <button
                        onClick={() => {
                            if (!isLogin) {
                                router.push("/login");
                                return;
                            }

                            if (isAdmin) router.push("/admin");
                            else router.push("/mypage/home");
                        }}
                        className="flex items-center"
                    >
                        {isLogin && profileImageUrl ? (
                            <Image
                                src={profileImageUrl}
                                alt="프로필"
                                width={28}
                                height={28}
                                className="rounded-full border border-red-400"
                            />
                        ) : (
                            <Image
                                src="/icons/user.PNG"
                                alt="프로필"
                                width={24}
                                height={24}
                                className="opacity-90"
                            />
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
