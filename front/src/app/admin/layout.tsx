// src/app/admin/layout.tsx
"use client";

import { ReactNode } from "react";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AdminGuard>
            <div className="min-h-screen flex bg-zinc-950 text-white">
                {/* 사이드바 */}
                <aside className="w-64 border-r border-zinc-800 p-4 hidden md:block">
                    <h1 className="text-xl font-bold mb-6">T1 Admin</h1>
                    <nav className="space-y-2 text-sm">
                        <a href="/admin" className="block hover:text-red-400">대시보드</a>
                        <a href="/admin/members" className="block hover:text-red-400">회원 관리</a>
                        <a href="/admin/orders" className="block hover:text-red-400">주문 관리</a>
                        <a href="/admin/items" className="block hover:text-red-400">상품 관리</a>
                    </nav>
                </aside>

                {/* 본문 */}
                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
