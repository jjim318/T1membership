"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();

    // 로그인 여부
    const [isLogin, setIsLogin] = useState(false);
    // 클라이언트 마운트 여부 (SSR/Hydration 안전용)
    const [mounted, setMounted] = useState(false);

    // 토큰 확인
    const checkLogin = () => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        setIsLogin(!!token);
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        setMounted(true);   // OK
        checkLogin();       // OK

        const handler = () => {
            checkLogin();
        };
        window.addEventListener("loginStateChange", handler);

        const storageHandler = () => {
            checkLogin();
        };
        window.addEventListener("storage", storageHandler);

        return () => {
            window.removeEventListener("loginStateChange", handler);
            window.removeEventListener("storage", storageHandler);
        };
    }, []);

    const handleLogout = () => {
        if (typeof window === "undefined") return;

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        window.dispatchEvent(new Event("loginStateChange"));

        alert("로그아웃 되었습니다.");
        setIsLogin(false);
        router.push("/");
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

            {/* 오른쪽 영역 */}
            <div className="flex items-center gap-4">
                {/* 🔐 서버 렌더링 때는 안 그리고, 클라이언트 마운트 후에만 렌더 */}
                {mounted && (
                    <>
                        {/* 로그인 된 상태일 때 알림/캘린더/장바구니 */}
                        {isLogin && (
                            <div className="hidden md:flex items-center gap-3">
                                <button>
                                    <Image
                                        src="/icons/bell.png"
                                        alt="알림"
                                        width={22}
                                        height={22}
                                    />
                                </button>
                                <button>
                                    <Image
                                        src="/icons/calendar.png"
                                        alt="캘린더"
                                        width={22}
                                        height={22}
                                    />
                                </button>
                                <button>
                                    <Image
                                        src="/icons/cart.png"
                                        alt="장바구니"
                                        width={22}
                                        height={22}
                                    />
                                </button>
                            </div>
                        )}

                        {/* 로그인 전/후 버튼 */}
                        {!isLogin ? (
                            // 🔓 로그인 전
                            <div className="flex items-center gap-3 text-xs md:text-sm">
                                <Link
                                    href="/login"
                                    className="px-3 py-1 rounded-full border border-zinc-600 hover:border-red-500 hover:text-red-400 transition"
                                >
                                    로그인
                                </Link>
                                <Link
                                    href="/join"
                                    className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-semibold transition"
                                >
                                    회원가입
                                </Link>
                            </div>
                        ) : (
                            // 🔒 로그인 후
                            <div className="flex items-center gap-3 text-xs md:text-sm">
                                <button
                                    onClick={() => router.push("/mypage")}
                                    className="flex items-center gap-2"
                                >
                                    <Image
                                        src="/icons/profile.png"
                                        alt="프로필"
                                        width={28}
                                        height={28}
                                        className="rounded-full border border-zinc-500"
                                    />
                                    <span className="hidden md:inline text-zinc-200">
                                        마이페이지
                                    </span>
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-1 rounded-full border border-zinc-600 hover:border-red-500 hover:text-red-400 transition"
                                >
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </header>
    );
}
