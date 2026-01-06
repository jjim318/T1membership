// src/app/community/layout.tsx
import type { ReactNode } from "react";

export default function CommunityRootLayout({ children }: { children: ReactNode }) {
    // ✅ 그룹 레이아웃((with-sidebar)/(no-sidebar))이 실제 UI를 담당
    return <>{children}</>;
}
