// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
    title: "T1 Membership Clone",
    description: "t1.fan 클론 코딩 프로젝트",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
        <body className="bg-black text-white">
        {/* 항상 맨 위 고정 헤더 */}
        <Header />

        {/* 🔥 고정 헤더 높이만큼 전체 페이지 위를 띄워줌 */}
        <main className="pt-16">
            {children}
        </main>

        {/* 공통 푸터 */}
        <Footer />
        </body>
        </html>
    );
}
