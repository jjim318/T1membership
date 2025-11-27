// src/app/admin/layout.tsx
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";
import { logout } from "@/lib/authClient";   // 🔥 로그아웃 유틸 불러오기

export default function AdminLayout({ children }: { children: ReactNode }) {
    const handleLogout = async () => {
        await logout(); // 토큰 삭제 + / 로 이동 (형님이 이미 만든 로직)
    };

    return (
        <AdminGuard>
            <div className="min-h-screen bg-black text-white pt-16">
                <div className="max-w-6xl mx-auto flex">
                    {/* 사이드바 */}
                    <aside
                        className="
                            hidden md:block
                            w-52
                            border-r border-zinc-800
                            pr-6
                            pl-6        /* 왼쪽 여백 */
                            text-sm
                        "
                    >
                        <h1 className="text-lg font-semibold mb-6 text-zinc-200">
                            T1 Admin
                        </h1>

                        <nav className="space-y-3">
                            <Link
                                href="/admin"
                                className="block text-zinc-400 hover:text-red-400"
                            >
                                대시보드
                            </Link>
                            <Link
                                href="/admin/member"
                                className="block text-zinc-400 hover:text-red-400"
                            >
                                회원 관리
                            </Link>
                            <Link
                                href="/admin/orders"
                                className="block text-zinc-400 hover:text-red-400"
                            >
                                주문 관리
                            </Link>
                            <Link
                                href="/admin/items"
                                className="block text-zinc-400 hover:text-red-400"
                            >
                                상품 관리
                            </Link>
                            <Link
                                href="/admin/mypage"
                                className="block text-zinc-400 hover:text-red-400"
                            >
                                마이페이지
                            </Link>
                        </nav>

                        {/* 🔥 관리자 로그아웃 버튼 */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="
                                mt-8
                                text-xs
                                text-zinc-500
                                hover:text-red-400
                            "
                        >
                            로그아웃
                        </button>
                    </aside>

                    {/* 본문 */}
                    <main className="flex-1 px-3 md:px-8 py-6">
                        {children}
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
