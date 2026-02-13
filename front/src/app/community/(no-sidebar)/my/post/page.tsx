// src/app/community/my/post/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// =========================
// 공통 타입
// =========================
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

type TabKey = "post" | "comment" | "reply";

interface PageResponseDTO<T> {
    dtoList: T[];
    total: number;
    page?: number;
    size?: number;
    start?: number;
    end?: number;
    prev?: boolean;
    next?: boolean;
}

function cx(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

// "2025-12-19T14:22:30.396359" → "2025.12.19"
function formatKoreanDate(raw?: string | null): string {
    if (!raw) return "";
    const s = raw.trim();
    if (!s) return "";
    const normalized = s.replace(" ", "T");
    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    const [, y, mm, dd] = m;
    return `${y}.${mm}.${dd}`;
}

function categoryToPath(raw?: string | null | undefined): string | null {
    if (!raw) return null;
    const c = raw.trim();
    if (!c) return null;

    // 형님 라우트가 /community/to-t1 형태면 "_" → "-" 치환 필요
    // (필요 없으면 replaceAll 줄 지워도 됨)
    return c.toLowerCase().replaceAll("_", "-");
}

// ✅ 포스트(내가 쓴 글) 응답
interface MyPostItem {
    boardNo: number;
    category: string | null; // null이면 story로 간주(임시 규칙)
    title: string;
    createdAt?: string | null;
}

// ✅ 내가 쓴 댓글 응답
interface MyCommentItem {
    commentNo: number;
    boardNo: number;
    category: string | null;
    boardTitle: string;
    commentContent: string;
    createdAt?: string | null;
}

// =========================
// API 호출
// =========================
async function fetchMyPosts() {
    const res = await apiClient.get<ApiResult<PageResponseDTO<MyPostItem>>>(
        "/board/my?type=POST"
    );
    return res.data;
}

async function fetchMyComments() {
    const res = await apiClient.get<ApiResult<PageResponseDTO<MyCommentItem>>>(
        "/comment/my"
    );
    return res.data;
}

export default function CommunityMyPostPage() {
    const router = useRouter();
    const sp = useSearchParams();

    // ✅ hydration 안전
    const [mounted, setMounted] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        setToken(localStorage.getItem("accessToken"));
    }, []);

    // 탭
    const tab = useMemo<TabKey>(() => {
        const t = (sp.get("tab") ?? "post").toLowerCase();
        if (t === "comment") return "comment";
        if (t === "reply") return "reply";
        return "post";
    }, [sp]);

    const setTab = (next: TabKey) => {
        const params = new URLSearchParams(sp.toString());
        params.set("tab", next);
        router.replace(`/community/my/post?${params.toString()}`);
    };

    // 데이터
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [posts, setPosts] = useState<MyPostItem[]>([]);
    const [comments, setComments] = useState<MyCommentItem[]>([]);

    useEffect(() => {
        let alive = true;

        const run = async () => {
            if (!mounted) return;

            if (!token) {
                if (!alive) return;
                setLoading(false);
                setErr(null);
                setPosts([]);
                setComments([]);
                return;
            }

            setLoading(true);
            setErr(null);

            try {
                if (tab === "post") {
                    const data = await fetchMyPosts();
                    if (!alive) return;

                    if (!data?.isSuccess || !data?.result) {
                        setErr(data?.resMessage ?? "불러오지 못했습니다.");
                        setPosts([]);
                        return;
                    }

                    setPosts(Array.isArray(data.result.dtoList) ? data.result.dtoList : []);
                    return;
                }

                if (tab === "comment") {
                    const data = await fetchMyComments();
                    if (!alive) return;

                    if (!data?.isSuccess || !data?.result) {
                        setErr(data?.resMessage ?? "불러오지 못했습니다.");
                        setComments([]);
                        return;
                    }

                    setComments(Array.isArray(data.result.dtoList) ? data.result.dtoList : []);
                    return;
                }

                // reply 미구현
                setErr(null);
            } catch {
                if (!alive) return;
                setErr("통신 오류");
                setPosts([]);
                setComments([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        };

        run();
        return () => {
            alive = false;
        };
    }, [mounted, token, tab]);

    // =========================
    // 렌더
    // =========================
    if (!mounted) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-[720px] px-6 py-14">
                    <div className="text-left text-sm text-white/60">불러오는 중…</div>
                </div>
            </main>
        );
    }

    if (!token) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-[720px] px-6 py-14">
                    <h1 className="text-left text-2xl font-semibold">내가 쓴 글</h1>

                    <div className="mt-10 text-left">
                        <div className="text-sm font-semibold text-white/90">로그인이 필요합니다.</div>
                        <div className="mt-2 text-xs text-white/60">
                            내가 쓴 글/댓글/답글은 로그인 후 확인할 수 있습니다.
                        </div>

                        <div className="mt-6 flex items-center gap-2">
                            <Link
                                href="/login"
                                className="rounded-full bg-white px-6 py-2 text-xs font-bold text-black hover:bg-white/90"
                            >
                                로그인
                            </Link>
                            <button
                                onClick={() => router.back()}
                                className="rounded-full border border-white/10 bg-white/10 px-6 py-2 text-xs font-bold text-white hover:bg-white/15"
                            >
                                뒤로
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const tabLabel: Record<TabKey, string> = {
        post: "포스트",
        comment: "댓글",
        reply: "답글",
    };

    const emptyText: Record<TabKey, string> = {
        post: "작성한 포스트가 없어요.",
        comment: "작성한 댓글이 없어요.",
        reply: "작성한 답글이 없어요.",
    };

    const isEmpty =
        tab === "post" ? posts.length === 0 : tab === "comment" ? comments.length === 0 : true;

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-[720px] px-6 py-14">
                <h1 className="text-left text-2xl font-semibold">내가 쓴 글</h1>

                {/* 탭 */}
                <div className="mt-6 flex items-end gap-6 text-sm text-white/60">
                    {(["post", "comment", "reply"] as TabKey[]).map((k) => {
                        const active = tab === k;
                        return (
                            <button
                                key={k}
                                onClick={() => setTab(k)}
                                className={cx(
                                    "relative pb-2 transition",
                                    active ? "text-white font-medium" : "hover:text-white/90"
                                )}
                            >
                                {tabLabel[k]}
                                {active ? <span className="absolute left-0 -bottom-[2px] h-[2px] w-8 bg-white" /> : null}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 h-px w-full bg-white/10" />

                {/* 본문 */}
                <div className="mt-10">
                    {loading ? (
                        <div className="text-left text-sm text-white/60">불러오는 중…</div>
                    ) : err ? (
                        <div className="text-left text-sm text-red-300">{err}</div>
                    ) : isEmpty ? (
                        <div className="mt-24 text-center text-sm text-white/50">{emptyText[tab]}</div>
                    ) : tab === "post" ? (
                        // ✅ 포스트 리스트 (커뮤니티/스토리 분기 링크)
                        <div className="space-y-6">
                            {posts.map((p) => {
                                const catPath = categoryToPath(p.category);

                                // ✅ 규칙:
                                // - category 있으면 커뮤니티 상세로
                                // - category 없으면 스토리 상세로
                                const href = catPath
                                    ? `/community/${catPath}/${p.boardNo}`
                                    : `/story/${p.boardNo}`;

                                return (
                                    <div key={p.boardNo} className="text-left">
                                        <Link
                                            href={href}
                                            className="text-sm font-semibold text-white/90 hover:text-white underline-offset-4 hover:underline"
                                        >
                                            {p.title}
                                        </Link>
                                        <div className="mt-2 text-xs text-white/50">{formatKoreanDate(p.createdAt)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // ✅ 댓글 리스트 (원글로 이동)
                        <div className="space-y-8">
                            {comments.map((c) => {
                                const catPath = categoryToPath(c.category);

                                // 댓글은 category 없으면 커뮤니티인지 스토리인지 판단이 애매
                                // 일단 category 있으면 커뮤니티로, 없으면 스토리로 보내는 임시 룰 적용 가능
                                const href = catPath
                                    ? `/community/${catPath}/${c.boardNo}`
                                    : `/story/${c.boardNo}`;

                                return (
                                    <div key={c.commentNo} className="text-left">
                                        <div className="text-xs text-white/50">{formatKoreanDate(c.createdAt)}</div>

                                        <div className="mt-2">
                                            <Link
                                                href={href}
                                                className="text-sm font-semibold text-white/90 hover:text-white underline-offset-4 hover:underline"
                                            >
                                                {c.boardTitle}
                                            </Link>
                                        </div>

                                        <div className="mt-2 text-sm text-white/70 whitespace-pre-wrap leading-6">
                                            {c.commentContent}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="h-10" />
            </div>
        </main>
    );
}
