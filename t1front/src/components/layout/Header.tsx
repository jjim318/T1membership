"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();

    // 로그인 여부 상태
    const [isLogin, setIsLogin] = useState(false);

    // 로그인 상태 확인 함수 (토큰 있는지 확인)
    const checkLogin = () => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("accessToken");
        setIsLogin(!!token); // 있으면 true, 없으면 false
    };

    // 화면이 처음 렌더링될 때 + 로그인 상태 변경 이벤트 들을 때
    useEffect(() => {
        if (typeof window === "undefined") return;

        // 처음 한 번 체크
        checkLogin();

        // 로그인/로그아웃 직후에 쏘는 커스텀 이벤트 감지
        const handler = () => {
            checkLogin();
        };

        window.addEventListener("loginStateChange", handler);

        // 혹시 다른 탭에서 로그인/로그아웃 했을 때도 반영하고 싶으면 storage도 추가
        const storageHandler = () => {
            checkLogin();
        };
        window.addEventListener("storage", storageHandler);

        return () => {
            window.removeEventListener("loginStateChange", handler);
            window.removeEventListener("storage", storageHandler);
        };
    }, []);

    // 로그아웃 버튼 눌렀을 때
    const handleLogout = () => {
        if (typeof window === "undefined") return;

        // 토큰들 삭제
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        // 헤더들한테 "로그인 상태 바뀜" 신호 보내기
        window.dispatchEvent(new Event("loginStateChange"));

        alert("로그아웃 되었습니다.");
        setIsLogin(false);      // 화면 상태 갱신(이 줄 없어도 이벤트로 다시 체크하긴 함)
        router.push("/");       // 메인으로 이동
    };

    return (
        <header className="fixed top-0 left-0 z-50 w-full h-14 flex items-center justify-between px-6 bg-black/90 text-white backdrop-blur-sm border-b border-zinc-800">
            {/* 왼쪽: 로고 + 메뉴 */}
            <div className="flex items-center gap-6">
                {/* 로고 */}
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

                {/* 네비게이션 메뉴 (t1.fan 느낌) */}
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
                    <Link href="/shop/kr" className="hover:text-white">
                        SHOP
                    </Link>
                    <Link href="/pop" className="hover:text-red-400">
                        POP
                    </Link>
                </nav>
            </div>

            {/* 오른쪽 영역 */}
            <div className="flex items-center gap-4">
                {/* 로그인 된 상태일 때만 아이콘 보여주기 */}
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

                {/* 로그인 전/후에 따라 우측 텍스트 버튼 변경 */}
                {!isLogin ? (
                    // 🔓 아직 로그인 안 했을 때 → 로그인 / 회원가입
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
                    // 🔒 로그인 되어 있을 때 → 마이페이지 / 로그아웃 + 프로필
                    <div className="flex items-center gap-3 text-xs md:text-sm">
                        {/* 프로필 아이콘 */}
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
            </div>
        </header>
    );
}
