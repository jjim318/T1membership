// src/app/admin/layout.tsx
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/admin/AdminGuard";
import { logout } from "@/lib/authClient";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const handleLogout = async () => {
        await logout();
    };

    const isActive = (prefix: string) => {
        if (!pathname) return false;
        if (prefix === "/admin") {
            // 대시보드: 정확히 /admin 일 때만
            return pathname === "/admin" || pathname === "/admin/";
        }
        return pathname === prefix || pathname.startsWith(prefix + "/");
    };

    const baseLinkClass =
        "block whitespace-nowrap text-sm transition-colors duration-150";

    return (
        <AdminGuard>
            <div className="min-h-screen bg-black text-white">
                {/* 헤더 높이만큼 띄우기 */}
                <div className="pt-16 max-w-6xl mx-auto flex">
                    {/* 사이드바 */}
                    <aside className="hidden md:block w-52 border-r border-zinc-800 px-6 py-8">
                        <h1 className="text-lg font-semibold mb-8 text-zinc-200 whitespace-nowrap">
                            T1 Admin
                        </h1>

                        <nav className="space-y-3">
                            <Link
                                href="/admin"
                                className={
                                    baseLinkClass +
                                    " " +
                                    (isActive("/admin")
                                        ? "text-red-500 font-semibold"
                                        : "text-zinc-400 hover:text-red-400")
                                }
                            >
                                대시보드
                            </Link>

                            <Link
                                href="/admin/member"
                                className={
                                    baseLinkClass +
                                    " " +
                                    (isActive("/admin/member")
                                        ? "text-red-500 font-semibold"
                                        : "text-zinc-400 hover:text-red-400")
                                }
                            >
                                회원 관리
                            </Link>

                            <Link
                                href="/admin/orders"
                                className={
                                    baseLinkClass +
                                    " " +
                                    (isActive("/admin/orders")
                                        ? "text-red-500 font-semibold"
                                        : "text-zinc-400 hover:text-red-400")
                                }
                            >
                                주문 관리
                            </Link>

                            <Link
                                href="/admin/items"
                                className={
                                    baseLinkClass +
                                    " " +
                                    (isActive("/admin/items")
                                        ? "text-red-500 font-semibold"
                                        : "text-zinc-400 hover:text-red-400")
                                }
                            >
                                상품 관리
                            </Link>

                            <Link
                                href="/admin/mypage"
                                className={
                                    baseLinkClass +
                                    " " +
                                    (isActive("/admin/mypage")
                                        ? "text-red-500 font-semibold"
                                        : "text-zinc-400 hover:text-red-400")
                                }
                            >
                                마이페이지
                            </Link>
                        </nav>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="mt-10 text-xs text-zinc-500 hover:text-red-400 whitespace-nowrap"
                        >
                            로그아웃
                        </button>
                    </aside>

                    {/* 본문 영역 */}
                    <main className="flex-1 px-3 md:px-8 pb-10 bg-black">
                        {children}
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
