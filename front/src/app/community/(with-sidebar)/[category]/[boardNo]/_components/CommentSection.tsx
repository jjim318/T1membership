// src/app/community/[category]/[boardNo]/_components/CommentSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number | string;
    resMessage: string | null;
    result: T;
    message?: string;
    path?: string;
    timestamp?: string;
}

type Props = {
    boardNo: number;
    meEmail: string | null;
    canWriteComment: boolean;
    isAdmin: boolean;
    isOwner: boolean;
};

const API = {
    list: (boardNo: number) => `/comment?boardNo=${boardNo}&page=0&size=50&sortBy=commentNo`,
    create: () => `/comment`,
    delete: (commentNo: number) => `/comment/${commentNo}`,
};

interface CommentItem {
    commentNo: number;
    boardNo: number;
    commentWriter: string;
    memberProfileImageUrl?: string | null;
    commentContent: string;
    commentLikeCount: number;
    createdAt: string;
}

// ✅ 서버 LocalDateTime → JS Date 안전 변환
function parseServerDate(raw?: string | null): Date | null {
    if (!raw) return null;
    let s = raw.trim();
    if (!s) return null;
    s = s.replace(/(\.\d{3})\d+/, "$1");
    if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) s += "+09:00";
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}
function formatDateTime(raw?: string | null): string {
    const d = parseServerDate(raw);
    if (!d) return "";
    return d.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function CommentSection({
                                           boardNo,
                                           meEmail,
                                           canWriteComment,
                                           isAdmin,
                                       }: Props) {
    const [items, setItems] = useState<CommentItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [text, setText] = useState("");
    const [posting, setPosting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const myLower = (meEmail ?? "").toLowerCase();

    const canPost = useMemo(() => {
        if (!canWriteComment) return false;
        if (!meEmail) return false;
        return true;
    }, [canWriteComment, meEmail]);

    const parseList = (r: any): CommentItem[] => {
        const list =
            Array.isArray(r?.dtoList) ? r.dtoList :
                Array.isArray(r?.content) ? r.content :
                    Array.isArray(r) ? r :
                        [];

        return (list as any[])
            .filter(Boolean)
            .map((x) => ({
                commentNo: x.commentNo,
                boardNo: x.boardNo,
                commentWriter: x.commentWriter,
                memberProfileImageUrl: x.memberProfileImageUrl ?? null,
                commentContent: x.commentContent,
                commentLikeCount: x.commentLikeCount ?? 0,
                createdAt: x.createdAt,
            }));
    };

    const load = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await apiClient.get<ApiResult<any>>(API.list(boardNo));
            const r = res.data.result;
            setItems(parseList(r));
        } catch (e: any) {
            setItems([]);
            setErrorMsg("댓글을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardNo]);

    const submit = async () => {
        const content = text.trim();
        if (!content) return;

        setPosting(true);
        setErrorMsg(null);

        try {
            const res = await apiClient.post<ApiResult<CommentItem>>(API.create(), {
                boardNo,
                commentContent: content,
            });

            const newComment = res.data.result;
            setItems((prev) => [newComment, ...prev]);
            setText("");
        } catch (e: any) {
            const status = e?.response?.status;
            const msg =
                e?.response?.data?.resMessage ||
                e?.response?.data?.message ||
                (status === 401
                    ? "로그인이 필요합니다."
                    : status === 403
                        ? "댓글 작성 권한이 없습니다."
                        : "댓글 작성 실패");

            setErrorMsg(String(msg));
        } finally {
            setPosting(false);
        }
    };

    const remove = async (commentNo: number) => {
        if (!confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            await apiClient.delete(API.delete(commentNo));
            setItems((prev) => prev.filter((x) => x.commentNo !== commentNo));
        } catch (e) {
            alert("삭제 실패");
        }
    };

    return (
        <section className="rounded-3xl bg-black/20 p-6 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
                <div className="text-white font-bold">댓글</div>
                <button
                    onClick={load}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                    새로고침
                </button>
            </div>

            <div className="mt-4">
                {!meEmail ? (
                    <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                        댓글 작성은 로그인 후 가능합니다.
                    </div>
                ) : !canPost ? (
                    <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                        댓글 작성 권한이 없습니다.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="댓글을 입력하세요"
                            className="min-h-[90px] w-full resize-none rounded-2xl bg-black/30 p-4 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/20"
                        />
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-white/40">{text.trim().length}자</div>
                            <button
                                onClick={submit}
                                disabled={posting || !text.trim()}
                                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 hover:bg-orange-500"
                            >
                                {posting ? "등록 중..." : "댓글 등록"}
                            </button>
                        </div>
                    </div>
                )}

                {errorMsg && <div className="mt-3 text-sm text-red-300">{errorMsg}</div>}
            </div>

            <div className="mt-6">
                {loading ? (
                    <div className="text-white/60">댓글 불러오는 중...</div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                        아직 댓글이 없습니다.
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {items.map((c) => {
                            const mine = myLower && c.commentWriter?.toLowerCase() === myLower;
                            const canDelete = isAdmin || mine;

                            return (
                                <li key={c.commentNo} className="rounded-2xl bg-black/20 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-xs text-white/50">
                                                {c.commentWriter} · {formatDateTime(c.createdAt)}
                                            </div>
                                            <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                                                {c.commentContent}
                                            </div>
                                        </div>

                                        {canDelete && (
                                            <button
                                                onClick={() => remove(c.commentNo)}
                                                className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                                            >
                                                삭제
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
