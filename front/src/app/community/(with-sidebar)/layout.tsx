// src/app/community/layout.tsx
"use client";

import Header from "@/components/layout/Header";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
    { key: "about", label: "About T1" },
    { key: "lounge", label: "T1 Lounge" },
    { key: "to-t1", label: "To. T1" },
] as const;

export default function CommunityLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-black text-white">
            {/* ✅ Header는 유지 */}
            <Header />

            {/* ✅ Footer 없음 */}
            <main className="mx-auto w-full max-w-6xl px-4 py-10">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
                    {/* 좌측 메뉴 */}
                    <aside className="rounded-2xl bg-white/5 p-3">
                        <nav className="flex flex-col gap-2">
                            {MENU.map((m) => {
                                const active = pathname.startsWith(`/community/${m.key}`);
                                return (
                                    <Link
                                        key={m.key}
                                        href={`/community/${m.key}`}
                                        className={[
                                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm",
                                            active
                                                ? "bg-white/10 text-white"
                                                : "text-white/60 hover:bg-white/5 hover:text-white",
                                        ].join(" ")}
                                    >
                                        <span className="inline-block h-2 w-2 rounded-full bg-white/30" />
                                        <span className="font-semibold">{m.label}</span>
                                        <span className="ml-auto text-xs text-white/40">•</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* 우측 본문 */}
                    <section className="min-h-[520px] rounded-2xl bg-white/5 p-6">
                        {children}
                    </section>
                </div>
            </main>
        </div>
    );
}
