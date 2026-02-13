// app/order/layout.tsx
import type { ReactNode } from "react";
import Script from "next/script";

export default function OrderLayout({ children }: { children: ReactNode }) {
    return (
        <>
            {children}

            {/* 🔥 Toss 결제창 SDK (window.TossPayments 생성) */}
            <Script
                src="https://js.tosspayments.com/v1"
                strategy="afterInteractive"
            />
        </>
    );
}