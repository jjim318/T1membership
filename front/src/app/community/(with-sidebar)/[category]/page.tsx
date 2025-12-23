// src/app/community/(no-sidebar)/my/post/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// =========================
// 타입
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
}

// ✅ 내가 쓴 글(포스트) DTO (필요하면 필드명 맞춰서 변경)
interface MyPostItem {
    boardNo: number;
    category?: string | null;
    title: string;
    createdAt?: string | null; // createdDate/latestDate 등 실제 필드로 바꿔도 됨
}

// ✅ 내가 쓴 댓글 DTO (필요하면 필드명 맞춰서 변경)
interface MyCommentItem {
    commentNo: number;
    boardNo: number;
    boardTitle?: string | null; // 있으면 표시
    commentContent: string;
    createdAt?: string | null;
}

function cx(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

// "2025-12-19T14:22:30.396359" → "2025.12.19 14:22"
function formatKoreanDateTime(raw?: string | null): string {
    if (!raw) return "";
    const s = raw.trim();
    if (!s) return "";
    const normalized = s.replace(" ", "T");

    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
    }

    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
        const [, yyyy, mm, dd, hh, mi] = m;
        return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
    }

    return s;
}

// =========================
// ✅ API 호출 (여기 엔드포인트만 형님 백엔드에 맞게)
// =========================
async function fetchMyPosts(page: number, size: number) {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("size", String(size));
    qs.set("sortBy", "boardNo"); // 필요 시 수정

    // ✅ 형님 백엔드에 맞게 바꿔도 되는 부분
    const res = await apiClient.get<ApiResult<PageResponseDTO<MyPostItem>>>(`/boards/my?${qs.toString()}`);
    return res.data;
}

async function fetchMyComments(page: number, size: number) {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("size", String(size));
    qs.set("sortBy", "commentNo");

    // ✅ 형님 백엔드에 맞게 바꿔도 되는 부분
    const res = await apiClient.get<ApiResult<PageResponseDTO<MyCommentItem>>>(`/comment/my?${qs.toString()}`);
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

    // 페이지네이션(형님 필요 없으면 나중에 없애도 됨)
    const [page] = useState(0);
    const [size] = useState(30);

    // 데이터 상태
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
                // ✅ 답글은 아직 안 함 → 탭 눌러도 빈 상태만 보여주기
                if (tab === "post") {
                    const data = await fetchMyPosts(page, size);
                    if (!alive) return;

                    if (!data?.isSuccess || !data?.result) {
                        setErr(data?.resMessage ?? "내가 쓴 글을 불러오지 못했습니다.");
                        setPosts([]);
                        return;
                    }

                    setPosts(Array.isArray(data.result.dtoList) ? data.result.dtoList : []);
                } else if (tab === "comment") {
                    const data = await fetchMyComments(page, size);
                    if (!alive) return;

                    if (!data?.isSuccess || !data?.result) {
                        setErr(data?.resMessage ?? "내가 쓴 댓글을 불러오지 못했습니다.");
                        setComments([]);
                        return;
                    }

                    setComments(Array.isArray(data.result.dtoList) ? data.result.dtoList : []);
                } else {
                    // reply
                    setErr(null);
                }
            } catch {
                if (!alive) return;
                setErr("통신 오류");
                if (tab === "post") setPosts([]);
                if (tab === "comment") setComments([]);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        };

        run();
        return () => {
            alive = false;
        };
    }, [mounted, token, tab, page, size]);

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
                            내가 쓴 글/댓글은 로그인 후 확인할 수 있습니다.
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
                                {active ? (
                                    <span className="absolute left-0 -bottom-[2px] h-[2px] w-8 bg-white" />
                                ) : null}
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
                    ) : tab === "post" ? (
                        posts.length === 0 ? (
                            <div className="mt-24 text-center text-sm text-white/50">
                                작성한 포스트가 없어요.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {posts.map((p) => (
                                    <div key={p.boardNo} className="text-left">
                                        <Link
                                            // ✅ 형님 커뮤니티 상세 라우트에 맞게 수정 가능
                                            href={`/community/${p.category ?? "about"}/${p.boardNo}`}
                                            className="text-sm font-semibold text-white/90 hover:text-white underline-offset-4 hover:underline"
                                        >
                                            {p.title}
                                        </Link>
                                        <div className="mt-2 text-xs text-white/50">
                                            {formatKoreanDateTime(p.createdAt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : tab === "comment" ? (
                        comments.length === 0 ? (
                            <div className="mt-24 text-center text-sm text-white/50">
                                작성한 댓글이 없어요.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {comments.map((c) => (
                                    <div key={c.commentNo} className="text-left">
                                        <Link
                                            href={`/community/about/${c.boardNo}`}
                                            className="text-sm font-semibold text-white/90 hover:text-white underline-offset-4 hover:underline"
                                            title="댓글이 달린 글로 이동"
                                        >
                                            {c.boardTitle ? c.boardTitle : `글 #${c.boardNo}`}
                                        </Link>
                                        <div className="mt-2 whitespace-pre-wrap text-sm text-white/75 leading-6">
                                            {c.commentContent}
                                        </div>
                                        <div className="mt-2 text-xs text-white/50">
                                            {formatKoreanDateTime(c.createdAt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // ✅ 답글은 아직 미구현 → 요구대로 건드리지 않음
                        <div className="mt-24 text-center text-sm text-white/50">
                            답글 기능은 아직 준비 중입니다.
                        </div>
                    )}
                </div>

                <div className="h-10" />
            </div>
        </main>
    );
}
