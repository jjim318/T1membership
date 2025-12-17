// src/app/community/page.tsx
import { redirect } from "next/navigation";

export default function CommunityRootPage() {
    // 기본 진입은 About T1
    redirect("/community/about");
}
