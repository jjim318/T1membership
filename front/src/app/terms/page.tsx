"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

type TermItem = {
    id: string;
    title: string;
    subtitle?: string;
};

const TERMS: TermItem[] = [
    { id: "61e4f93567264c35863a0925", title: "개인정보 수집 및 이용 동의" },
    { id: "61e4f93567264c35863a0927", title: "청소년보호정책" },
    { id: "61e4f93567264c35863a0926", title: "개인정보처리방침" },
    { id: "6347cbcb886a8118029f0c41", title: "커뮤니티 이용 약관" },
    { id: "61e4f93567264c35863a0924", title: "이용약관" },
];

export default function TermsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />

            <main className="pt-20 pb-16">
                <div className="max-w-5xl mx-auto px-4 md:px-6">
                    <h1 className="text-2xl md:text-3xl font-bold mb-10 text-center">
                        이용약관
                    </h1>

                    <div className="bg-zinc-900/60 rounded-2xl overflow-hidden border border-zinc-800">
                        {TERMS.map((t, idx) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => router.push(`/terms/${t.id}`)}
                                className={`w-full flex items-center justify-between px-5 md:px-6 py-5 text-left hover:bg-zinc-900 transition ${
                                    idx !== TERMS.length - 1 ? "border-b border-zinc-800" : ""
                                }`}
                            >
                                <div className="min-w-0">
                                    <div className="text-sm md:text-base font-semibold truncate">
                                        {t.title}
                                    </div>
                                    {t.subtitle && (
                                        <div className="text-xs text-zinc-500 mt-1 truncate">
                                            {t.subtitle}
                                        </div>
                                    )}
                                </div>
                                <span className="text-zinc-500 text-xl leading-none">›</span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
