// src/app/story/[storyId]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

type MembershipPayType =
    | "ONE_TIME"
    | "YEARLY"
    | "RECURRING"
    | "NO_MEMBERSHIP"
    | string;

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface MemberReadOneRes {
    memberEmail: string;
    memberRole?: string | null;
    membershipPayType: MembershipPayType;
}

interface StoryDetailRes {
    boardNo: number;
    writer: string;
    title: string;
    content: string;
    locked: boolean;
    likeCount: number;
    likedByMe: boolean;
    imageUrls?: string[] | null;
    createdDate?: string | null;
}

interface ToggleStoryLikeRes {
    liked: boolean;
    likeCount: number;
}

interface ReadCommentRes {
    commentNo: number;
    boardNo: number;
    commentWriter: string;
    memberProfileImageUrl?: string | null;
    commentContent: string;
    commentLikeCount: number;
    createdAt?: string | null;
    isMine: boolean; // ✅ 백엔드에서 내려줌
}

interface PageResponseDTO<T> {
    dtoList: T[];
    total: number;
}

function isPrivilegedRole(role?: string | null) {
    if (!role) return false;
    if (role === "ADMIN" || role === "ADMIN_CONTENT" || role === "T1") return true;
    return role.startsWith("PLAYER_");
}

function cx(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

// ✅ "2025-12-19T14:22:30.396359" → "2025.12.19 14:22"
function formatKoreanDateTime(raw?: string | null): string {
    if (!raw) return "";
    const s = raw.trim();
    if (!s) return "";

    const normalized = s.replace(" ", "T");

    // 1) Date 파싱 시도
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
    }

    // 2) Date가 못 먹는 형태면 문자열로 잘라 처리
    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
        const [, yyyy, mm, dd, hh, mi] = m;
        return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
    }

    return s;
}

// ✅ token 인자로 받아 안전하게
function useAccessGate(token: string | null) {
    const [loading, setLoading] = useState(true);
    const [canViewProtected, setCanViewProtected] = useState(false);
    const [me, setMe] = useState<MemberReadOneRes | null>(null);

    useEffect(() => {
        let alive = true;

        const run = async () => {
            if (!token) {
                if (!alive) return;
                setLoading(false);
                setCanViewProtected(false);
                setMe(null);
                return;
            }

            try {
                const res = await apiClient.get<ApiResult<MemberReadOneRes>>("/member/readOne");

                if (!alive) return;

                if (!res.data.isSuccess || !res.data.result) {
                    setCanViewProtected(false);
                    setMe(null);
                    return;
                }

                const my = res.data.result;
                setMe(my);

                const role = (my.memberRole ?? "").toString();
                const privileged = isPrivilegedRole(role);

                const payType = (my.membershipPayType ?? "NO_MEMBERSHIP").toString();
                const memberActive = payType !== "NO_MEMBERSHIP";

                setCanViewProtected(privileged || memberActive);
            } catch {
                if (!alive) return;
                setCanViewProtected(false);
                setMe(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        };

        setLoading(true);
        run();

        return () => {
            alive = false;
        };
    }, [token]);

    return { loading, canViewProtected, me };
}

export default function StoryDetailPage() {
    const { storyId } = useParams<{ storyId: string }>();
    const router = useRouter();

    // ✅ hydration 방지: mounted 이후에만 localStorage 읽기
    const [mounted, setMounted] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        setToken(localStorage.getItem("accessToken"));
    }, []);

    const { loading: gateLoading, canViewProtected, me } = useAccessGate(token);

    const isAdminLike = useMemo(() => {
        const role = (me?.memberRole ?? "").toString();
        return isPrivilegedRole(role);
    }, [me?.memberRole]);

    const [data, setData] = useState<StoryDetailRes | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // 좋아요 상태
    const [likeCount, setLikeCount] = useState(0);
    const [liked, setLiked] = useState(false);
    const [likeBusy, setLikeBusy] = useState(false);

    // 댓글 상태
    const [comments, setComments] = useState<ReadCommentRes[]>([]);
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentErr, setCommentErr] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const [commentBusy, setCommentBusy] = useState(false);

    const [commentPage] = useState(0);
    const [commentSize] = useState(20);

    const locked = useMemo(() => {
        if (!data) return false;
        return data.locked && !canViewProtected;
    }, [data, canViewProtected]);

    // ✅ 상세 로드 (훅은 항상 호출! 내부에서 조건으로 막기)
    useEffect(() => {
        let alive = true;

        const run = async () => {
            // mounted 전이거나 토큰 없으면 호출 안 함
            if (!mounted || !token) {
                if (!alive) return;
                setLoading(false);
                setErr(null);
                setData(null);
                return;
            }

            if (!storyId || storyId === "undefined") {
                if (!alive) return;
                setLoading(false);
                setErr("잘못된 스토리 주소입니다.");
                setData(null);
                return;
            }

            setLoading(true);
            setErr(null);

            try {
                const res = await apiClient.get<ApiResult<StoryDetailRes>>(
                    `/boards/story/${storyId}`
                );

                if (!alive) return;

                if (!res.data.isSuccess || !res.data.result) {
                    setErr(res.data.resMessage || "상세를 불러오지 못했습니다.");
                    setData(null);
                    return;
                }

                const d = res.data.result;
                setData(d);
                setLikeCount(Number(d.likeCount ?? 0));
                setLiked(!!d.likedByMe);
            } catch {
                if (!alive) return;
                setErr("통신 오류");
                setData(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        };

        run();

        return () => {
            alive = false;
        };
    }, [storyId, token, mounted]);

    // 댓글 로드
    const loadComments = async (boardNo: number) => {
        if (!token) return;

        setCommentLoading(true);
        setCommentErr(null);

        try {
            const qs = new URLSearchParams();
            qs.set("boardNo", String(boardNo));
            qs.set("page", String(commentPage));
            qs.set("size", String(commentSize));
            qs.set("sortBy", "commentNo");

            const res = await apiClient.get<ApiResult<PageResponseDTO<ReadCommentRes>>>(
                `/comment?${qs.toString()}`
            );

            if (res.data?.isSuccess && res.data.result) {
                setComments(
                    Array.isArray(res.data.result.dtoList) ? res.data.result.dtoList : []
                );
            } else {
                setComments([]);
                setCommentErr(res.data?.resMessage ?? "댓글을 불러오지 못했습니다.");
            }
        } catch {
            setComments([]);
            setCommentErr("댓글 통신 오류");
        } finally {
            setCommentLoading(false);
        }
    };

    // data 바뀌면 댓글 로드
    useEffect(() => {
        if (!mounted) return;
        if (!token) return;
        if (!data) return;

        if (locked) {
            setComments([]);
            return;
        }

        loadComments(data.boardNo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.boardNo, locked, token, mounted]);

    // 좋아요 토글
    const onToggleLike = async () => {
        if (!token) {
            router.push("/login");
            return;
        }
        if (!data) return;
        if (likeBusy) return;

        setLikeBusy(true);
        try {
            const res = await apiClient.post<ApiResult<ToggleStoryLikeRes>>(
                `/boards/story/${data.boardNo}/like`
            );

            if (res.data?.isSuccess && res.data.result) {
                setLiked(res.data.result.liked);
                setLikeCount(Number(res.data.result.likeCount ?? 0));
            } else {
                alert(res.data?.resMessage ?? "좋아요 처리 실패");
            }
        } catch {
            alert("좋아요 처리 통신 오류");
        } finally {
            setLikeBusy(false);
        }
    };

    // 댓글 작성
    const onCreateComment = async () => {
        if (!token) {
            router.push("/login");
            return;
        }
        if (!data) return;
        if (locked) return;

        const text = commentText.trim();
        if (!text) return;

        if (commentBusy) return;
        setCommentBusy(true);

        try {
            const body = { boardNo: data.boardNo, commentContent: text };
            const res = await apiClient.post<ApiResult<any>>("/comment", body);

            if (res.data?.isSuccess) {
                setCommentText("");
                await loadComments(data.boardNo);
            } else {
                alert(res.data?.resMessage ?? "댓글 작성 실패");
            }
        } catch {
            alert("댓글 작성 통신 오류");
        } finally {
            setCommentBusy(false);
        }
    };

    // 댓글 삭제
    const onDeleteComment = async (commentNo: number) => {
        if (!data) return;

        const target = comments.find((x) => x.commentNo === commentNo);
        const can = !!target && (target.isMine || isAdminLike);
        if (!can) {
            alert("댓글 삭제 권한이 없습니다.");
            return;
        }

        if (!confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            const res = await apiClient.delete<ApiResult<any>>(`/comment/${commentNo}`);
            if (res.data?.isSuccess) {
                await loadComments(data.boardNo);
            } else {
                alert(res.data?.resMessage ?? "댓글 삭제 실패");
            }
        } catch (e: any) {
            const msg =
                e?.response?.status === 403
                    ? "댓글 삭제 권한이 없습니다."
                    : "댓글 삭제 통신 오류";
            alert(msg);
        }
    };

    // 댓글 수정
    const onUpdateComment = async (commentNo: number, prev: string) => {
        if (!data) return;

        const target = comments.find((x) => x.commentNo === commentNo);
        const can = !!target && (target.isMine || isAdminLike);
        if (!can) {
            alert("댓글 수정 권한이 없습니다.");
            return;
        }

        const next = prompt("댓글 수정", prev);
        if (next === null) return;

        const text = next.trim();
        if (!text) return;

        try {
            const res = await apiClient.put<ApiResult<any>>(`/comment/${commentNo}`, {
                commentContent: text,
            });

            if (res.data?.isSuccess) {
                await loadComments(data.boardNo);
            } else {
                alert(res.data?.resMessage ?? "댓글 수정 실패");
            }
        } catch (e: any) {
            const msg =
                e?.response?.status === 403
                    ? "댓글 수정 권한이 없습니다."
                    : "댓글 수정 통신 오류";
            alert(msg);
        }
    };

    // =========================
    // ✅ 여기부터 렌더 분기 (훅 다 호출한 뒤!)
    // =========================

    // mounted 전에는 무조건 동일 UI로 (hydration 안전)
    if (!mounted) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-3xl px-4 py-8 text-white/60 text-sm">
                    불러오는 중…
                </div>
            </main>
        );
    }

    // 비로그인 유도
    if (!token) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-3xl px-4 py-10">
                    <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
                        <div className="text-3xl">🔒</div>
                        <div className="mt-3 text-sm font-semibold">로그인이 필요합니다.</div>
                        <div className="mt-2 text-xs text-white/60">
                            스토리는 로그인 후 이용할 수 있어요.
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2">
                            <Link
                                href="/login"
                                className="rounded-full bg-white px-6 py-2 text-xs font-bold text-black hover:bg-white/90"
                            >
                                로그인 하러가기
                            </Link>
                            <Link
                                href="/membership/all"
                                className="rounded-full bg-white/10 border border-white/10 px-6 py-2 text-xs font-bold text-white hover:bg-white/15"
                            >
                                멤버십 보기
                            </Link>
                        </div>
                    </div>

                    <button
                        className="mt-4 rounded-full bg-white/10 border border-white/10 px-5 py-2 text-xs text-white/80"
                        onClick={() => router.back()}
                    >
                        뒤로
                    </button>
                </div>
            </main>
        );
    }

    if (loading || gateLoading) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-3xl px-4 py-8 text-white/60 text-sm">
                    불러오는 중…
                </div>
            </main>
        );
    }

    if (err) {
        return (
            <main className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-red-300 text-sm">
                        {err}
                    </div>
                    <button
                        className="mt-4 rounded-full bg-white/10 border border-white/10 px-5 py-2 text-xs"
                        onClick={() => router.back()}
                    >
                        뒤로
                    </button>
                </div>
            </main>
        );
    }

    if (!data) return null;

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-3xl px-4 py-8">
                <Link href="/story/feed" className="text-xs text-white/60 hover:text-white/90">
                    ← 피드로
                </Link>

                <div className="mt-4 rounded-3xl bg-white/5 border border-white/10 p-6">
                    <div className="text-xs text-white/50">{data.writer}</div>
                    <h1 className="mt-2 text-xl font-bold">{data.title}</h1>

                    {/* 좋아요 */}
                    <div className="mt-5">
                        <button
                            type="button"
                            onClick={onToggleLike}
                            disabled={likeBusy}
                            className={[
                                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition",
                                liked
                                    ? "bg-orange-500 text-black border-orange-400"
                                    : "bg-white/10 text-white border-white/15 hover:bg-white/15",
                                likeBusy ? "opacity-60 cursor-not-allowed" : "",
                            ].join(" ")}
                            title={locked ? "잠금 상태여도 좋아요는 가능합니다." : "좋아요"}
                        >
                            <span>♥</span>
                            <span>{Number(likeCount).toLocaleString()}</span>
                        </button>
                    </div>

                    {/* 본문/잠금 */}
                    <div className="mt-6">
                        {locked ? (
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
                                <div className="text-3xl">🔒</div>
                                <div className="mt-3 text-sm font-semibold">
                                    멤버십 회원 전용 콘텐츠입니다.
                                </div>
                                <div className="mt-2 text-xs text-white/60">
                                    좋아요는 가능하지만, 댓글/내용은 멤버십 전용입니다.
                                </div>
                                <Link
                                    href="/membership/all"
                                    className="mt-5 inline-flex rounded-full bg-white px-6 py-2 text-xs font-bold text-black hover:bg-white/90"
                                >
                                    멤버십 가입하러 가기
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="whitespace-pre-wrap text-sm text-white/80 leading-7">
                                    {data.content}
                                </div>

                                {Array.isArray(data.imageUrls) && data.imageUrls.length > 0 ? (
                                    <div className="mt-6 flex flex-col gap-3">
                                        {data.imageUrls.map((u, idx) => (
                                            <img
                                                key={`${u}-${idx}`}
                                                src={u}
                                                alt={`story-img-${idx}`}
                                                className="w-full rounded-2xl border border-white/10"
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    {/* 댓글 */}
                    <div className="mt-8">
                        <div className="text-sm font-semibold text-white/90">댓글</div>

                        {locked ? (
                            <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/60">
                                댓글은 멤버십 회원만 작성/조회할 수 있습니다.
                            </div>
                        ) : (
                            <>
                                {/* 작성 */}
                                <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4">
                  <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      placeholder="댓글을 입력하세요."
                      className="w-full resize-none rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white/90 placeholder:text-white/30 outline-none"
                  />
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={onCreateComment}
                                            disabled={commentBusy || !commentText.trim()}
                                            className={cx(
                                                "rounded-full px-5 py-2 text-xs font-bold",
                                                commentBusy || !commentText.trim()
                                                    ? "bg-white/20 text-white/40 cursor-not-allowed"
                                                    : "bg-white text-black hover:bg-white/90"
                                            )}
                                        >
                                            {commentBusy ? "등록 중…" : "등록"}
                                        </button>
                                    </div>
                                </div>

                                {/* 목록 */}
                                <div className="mt-4 space-y-3">
                                    {commentLoading ? (
                                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/60">
                                            댓글 불러오는 중…
                                        </div>
                                    ) : commentErr ? (
                                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-red-300">
                                            {commentErr}
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/60">
                                            아직 댓글이 없습니다.
                                        </div>
                                    ) : (
                                        comments.map((c) => (
                                            <div
                                                key={c.commentNo}
                                                className="rounded-2xl bg-white/5 border border-white/10 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs text-white/70 font-semibold">
                                                            {c.commentWriter}
                                                        </div>
                                                        <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                                                            {c.commentContent}
                                                        </div>
                                                        <div className="mt-2 text-[11px] text-white/40">
                                                            {formatKoreanDateTime(c.createdAt)}
                                                        </div>
                                                    </div>

                                                    {/* ✅ 본인/관리자만 */}
                                                    {c.isMine || isAdminLike ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                className="rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1 text-[11px]"
                                                                onClick={() => onUpdateComment(c.commentNo, c.commentContent)}
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1 text-[11px]"
                                                                onClick={() => onDeleteComment(c.commentNo)}
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
