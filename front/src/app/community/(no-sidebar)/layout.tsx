// src/app/community/(no-sidebar)/layout.tsx
import type { ReactNode } from "react";
import Header from "@/components/layout/Header";

export default function CommunityNoSidebarLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* ✅ Header는 유지 */}
            <Header />

            {/* ✅ 여기서는 사이드바/카드 레이아웃 없이, 그냥 children이 전체를 씀 */}
            {children}
        </div>
    );
}
