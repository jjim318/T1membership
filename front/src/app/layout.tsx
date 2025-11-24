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
    // 여기서 모든 페이지의 공통 뼈대를 만든다
    return (
        <html lang="ko">
        <body>
        {/* 위에 항상 보이는 메뉴바 */}
        <Header />

        {/* 페이지마다 달라지는 내용이 들어가는 자리 */}
        <main>{children}</main>

        {/* 맨 아래 공통 영역 */}
        <Footer />
        </body>
        </html>
    );
}
