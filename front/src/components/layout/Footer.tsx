// src/components/layout/Footer.tsx
"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    // 🔥 /shop 은 목록, /shop/숫자 이런 애들은 상세
    const isShopDetail =
        pathname?.startsWith("/shop/") && pathname !== "/shop";

    // 🔥 상품 상세페이지에서는 공용푸터 출력 안 함
    if (isShopDetail) {
        return null;
    }

    // 👉 그 외 모든 페이지에서는 기존 공용푸터 그대로
    return (
        <footer
            style={{
                marginTop: "40px",
                padding: "24px",
                backgroundColor: "#111",
                color: "#888",
                fontSize: "12px",
                textAlign: "center",
            }}
        >
            <div>T1 Membership 클론 코딩</div>
            <div>© T1. All Rights Reserved.</div>
        </footer>
    );
}
