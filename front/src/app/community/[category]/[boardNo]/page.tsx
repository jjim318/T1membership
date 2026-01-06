// src/app/community/[category]/[boardNo]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import CommentSection from "./_components/CommentSection";

type RouteCategory = "about" | "lounge" | "to-t1";

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number | string;
    resMessage: string | null;
    result: T;
    message?: string;
    path?: string;
    timestamp?: string;
}

interface MemberReadOneRes {
    memberEmail: string;
    memberRole: string;
    membershipPayType?: string;
}

type ImageItem = {
    fileName?: string | null;
    sortOrder?: number | null;
    url?: string | null; // "/files/xxx.jpg"
    contentType?: string | null;
};

interface BoardDetail {
    boardNo: number;
    boardTitle: string;
    boardWriter: string; // 닉네임
    boardWriterEmail?: string | null; // ✅ 이메일 비교용
    boardContent: string;
    boardType?: string;
    categoryCode?: string | null;
    createdDate?: string;
    latestDate?: string;
    notice?: boolean;
    secret?: boolean;
    images?: ImageItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function toImageSrc(raw?: string | null) {
    if (!raw) return "";
    const u = raw.trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/files")) return `${API_BASE}${u}`;
    return u;
}

function isAdminRole(role?: string) {
    return role === "ADMIN" || role === "MANAGER";
}

function categoryMeta(route: RouteCategory) {
    const map: Record<RouteCategory, { title: string; hint: string; privateNotice?: string }> = {
        about: { title: "About T1", hint: "멤버십 회원 커뮤니티" },
        lounge: {
            title: "T1 Lounge",
            hint: "멤버십 회원 전용(선수 접근 불가)",
            privateNotice: "스타에게 노출되지 않는 비공개 보드에요.",
        },
        "to-t1": {
            title: "To. T1",
            hint: "멤버십 작성 / 관리자 + 본인 열람",
            privateNotice: "매니저만 열람할 수 있는 비공개 보드에요.",
        },
    };
    return map[route];
}

function TopPrivateNoticeBar({ text }: { text: string }) {
    return (
        <div className="mb-4 rounded-xl bg-black/30 ring-1 ring-white/10 px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-sm text-white/70">
                <span className="text-base">🔒</span>
                <span>{text}</span>
            </div>
        </div>
    );
}

// ✅ 서버 LocalDateTime → JS Date 안전 변환(상세도 Invalid Date 방지)
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

export default function CommunityBoardDetailPage() {
    const params = useParams();
    const router = useRouter();

    const rawCategory = (params?.category as string | undefined) ?? "about";
    const rawBoardNo = (params?.boardNo as string | undefined) ?? "";

    const route: RouteCategory =
        rawCategory === "about" || rawCategory === "lounge" || rawCategory === "to-t1"
            ? rawCategory
            : "about";

    const boardNo = Number(rawBoardNo);
    const meta = useMemo(() => categoryMeta(route), [route]);

    const [me, setMe] = useState<MemberReadOneRes | null>(null);
    const [loadingMe, setLoadingMe] = useState(true);

    const [board, setBoard] = useState<BoardDetail | null>(null);
    const [loadingBoard, setLoadingBoard] = useState(true);

    const [forbidden, setForbidden] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [deleting, setDeleting] = useState(false);

    const images = useMemo(() => {
        const list = Array.isArray(board?.images) ? board!.images! : [];
        return list
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((img) => ({
                ...img,
                src: toImageSrc(img.url ?? null),
            }))
            .filter((img) => !!img.src);
    }, [board]);

    useEffect(() => {
        const run = async () => {
            try {
                const res = await apiClient.get<ApiResult<MemberReadOneRes>>("/member/readOne");
                setMe(res.data.result);
            } catch {
                setMe(null);
            } finally {
                setLoadingMe(false);
            }
        };
        run();
    }, []);

    useEffect(() => {
        if (!boardNo || Number.isNaN(boardNo)) {
            setErrorMsg("잘못된 게시글 번호입니다.");
            setLoadingBoard(false);
            return;
        }

        const run = async () => {
            setLoadingBoard(true);
            setForbidden(false);
            setErrorMsg(null);

            try {
                const res = await apiClient.get<ApiResult<BoardDetail>>(`/board/${boardNo}`);
                setBoard(res.data.result);
            } catch (e: any) {
                const status = e?.response?.status;
                if (status === 403) setForbidden(true);
                else if (status === 404) setErrorMsg("게시글을 찾을 수 없습니다.");
                else setErrorMsg("게시글을 불러오지 못했습니다.");
                setBoard(null);
            } finally {
                setLoadingBoard(false);
            }
        };

        run();
    }, [boardNo]);

    if (loadingMe || loadingBoard) return <div className="text-white/70">불러오는 중...</div>;

    if (forbidden) {
        return (
            <div className="flex flex-col gap-4">
                {meta.privateNotice && <TopPrivateNoticeBar text={meta.privateNotice} />}
                <div className="flex min-h-[520px] flex-col items-center justify-center gap-4">
                    <div className="text-4xl">🔒</div>
                    <div className="text-white/80">
                        접근 권한이 없습니다. {route === "to-t1" ? "관리자 또는 작성자만 열람 가능합니다." : ""}
                    </div>
                    <Link
                        href={`/community/${route}`}
                        className="rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
                    >
                        목록으로
                    </Link>
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex flex-col gap-4">
                <div className="rounded-2xl bg-black/20 p-6 text-white/70">{errorMsg}</div>
                <Link
                    href={`/community/${route}`}
                    className="w-fit rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                    목록으로
                </Link>
            </div>
        );
    }

    if (!board) return null;

    const isAdmin = isAdminRole(me?.memberRole);

    const isOwner =
        !!me?.memberEmail &&
        !!board.boardWriterEmail &&
        me.memberEmail.toLowerCase() === board.boardWriterEmail.toLowerCase();

    const canDelete = !!(isAdmin || isOwner);

    const handleDelete = async () => {
        if (!canDelete) return;

        const ok = window.confirm("이 게시글을 삭제하시겠습니까? (삭제 후 복구 불가)");
        if (!ok) return;

        setDeleting(true);
        try {
            await apiClient.delete<ApiResult<unknown>>(`/board/${board.boardNo}`);
            router.push(`/community/${route}`);
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 403) alert("삭제 권한이 없습니다.");
            else alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <div className="text-lg font-bold text-white">{meta.title}</div>
                    <div className="mt-1 text-sm text-white/50">{meta.hint}</div>
                </div>

                <Link
                    href={`/community/${route}`}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                    목록
                </Link>
            </div>

            {meta.privateNotice && <TopPrivateNoticeBar text={meta.privateNotice} />}

            <article className="rounded-3xl bg-black/20 p-6 ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl font-bold text-white">{board.boardTitle}</h1>

                    {canDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="shrink-0 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200 ring-1 ring-red-400/30 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isAdmin ? "관리자 삭제" : "작성자 삭제"}
                        >
                            {deleting ? "삭제 중..." : "삭제"}
                        </button>
                    )}
                </div>

                <div className="mt-2 text-xs text-white/50">
                    {board.boardWriter} · {formatDateTime(board.createdDate ?? board.latestDate)}
                </div>

                <div className="mt-5 whitespace-pre-wrap text-white/80 leading-relaxed">{board.boardContent}</div>

                {images.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {images.map((img, idx) => (
                            <img
                                key={`${img.fileName ?? "img"}-${idx}`}
                                src={(img as any).src}
                                alt="board image"
                                className="w-full rounded-2xl ring-1 ring-white/10"
                            />
                        ))}
                    </div>
                )}
            </article>

            <CommentSection
                boardNo={board.boardNo}
                meEmail={me?.memberEmail ?? null}
                canWriteComment={true}
                isAdmin={!!isAdmin}
                isOwner={!!isOwner}
            />
        </div>
    );
}
