// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

interface MemberInfo {
    profileImageUrl?: string | null;
}

export default function Header() {
    const router = useRouter();

    const [isLogin, setIsLogin] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [cartCount, setCartCount] = useState<number>(0);
    const [hasNotification, setHasNotification] = useState<boolean>(false);

    const checkLogin = () => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        setIsLogin(!!token);
    };

    const loadLoginRelatedInfo = async () => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        if (!token) {
            setProfileImageUrl(null);
            setCartCount(0);
            setHasNotification(false);
            return;
        }

        try {
            const memberRes = await apiClient.get("/member/readOne");
            const memberData: MemberInfo =
                memberRes.data?.result ?? memberRes.data?.data ?? {};

            setProfileImageUrl(memberData.profileImageUrl ?? null);

            // 아직 백엔드 없으니까 임시값
            setCartCount(0);
            setHasNotification(false);
        } catch (e) {
            console.error("[Header] loadLoginRelatedInfo 실패", e);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        checkLogin();
        loadLoginRelatedInfo();

        const sync = () => {
            checkLogin();
            loadLoginRelatedInfo();
        };

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
        <header className="fixed top-0 left-0 z-50 w-full h-14 flex items-center justify-between px-6 bg-black/90 text-white backdrop-blur-sm border-b border-zinc-800">
            {/* 왼쪽: 로고 + 메뉴 */}
            <div className="flex items-center gap-6">
                <Link href="/public" className="flex items-center gap-2">
                    <Image
                        src="/icons/t1.png"
                        alt="T1 Logo"
                        width={32}
                        height={32}
                        className="cursor-pointer"
                    />
                    <span className="text-sm font-semibold tracking-[0.2em] text-red-400">
                        T1 MEMBERSHIP
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-5 text-sm text-zinc-300">
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

            {/* 오른쪽: 아이콘 네 개 (항상 렌더, 상태에 따라 뱃지만 변경) */}
            <div className="flex items-center gap-5 text-white">
                {/* 알림 */}
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

                {/* 캘린더 */}
                <button onClick={() => handleProtectedClick("/schedule")}>
                    <Image
                        src="/icons/calendar.png"
                        alt="캘린더"
                        width={22}
                        height={22}
                    />
                </button>

                {/* 장바구니 */}
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
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[4px] rounded-full bg-red-500 text-[11px] font-semibold flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                </button>

                {/* 프로필 / 로그인 아이콘 */}
                <button
                    onClick={() =>
                        isLogin ? router.push("/mypage") : router.push("/login")
                    }
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
        </header>
    );
}
