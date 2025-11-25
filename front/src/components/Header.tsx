// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Header() {
    return (
        <header className="w-full h-14 flex items-center justify-between px-6 bg-black text-white">
            {/* 왼쪽 T1 로고 자리 */}
            <div className="flex items-center gap-4">
                <Image
                    src="/icons/t1.png"
                    alt="T1 Logo"
                    width={40}
                    height={40}
                    className="cursor-pointer"
                />

                <nav className="flex items-center gap-6 text-sm">
                    <Link href="/">Home</Link>
                    <Link href="/story">Story</Link>
                    <Link href="/content">Content</Link>
                    <Link href="/community">Community</Link>
                    <Link href="/shop">Shop</Link>
                    <Link href="/pop">POP</Link>
                </nav>
            </div>

            {/* 오른쪽 아이콘 영역 (알림/캘린더/장바구니/프로필 등) */}
            <div className="flex items-center gap-4 text-xl">
                <button>
                    <Image
                        src="/icons/bell.png"     // public/icons/bell.png
                        alt="알림"
                        width={24}
                        height={24}
                    />
                </button>

                <button>
                    <Image
                        src="/icons/calendar.png" // public/icons/calendar.png
                        alt="캘린더"
                        width={24}
                        height={24}
                    />
                </button>

                <button>
                    <Image
                        src="/icons/cart.png"     // public/icons/cart.png
                        alt="장바구니"
                        width={24}
                        height={24}
                    />
                </button>

                <button>
                    <Image
                        src="/icons/profile.png"  // public/icons/profile.png
                        alt="프로필"
                        width={32}
                        height={32}
                        className="rounded-full"
                    />
                </button>
            </div>
        </header>
    );
}
