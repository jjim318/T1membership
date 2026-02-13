// src/app/content/[boardNo]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// ======================
// 타입 정의
// ======================

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// 백엔드 ReadOneBoardRes 기준(+ videoUrl, duration 확장)
interface ContentDetail {
    boardNo: number;
    boardTitle: string;
    boardWriter: string;
    boardContent: string;
    boardLikeCount: number;
    notice: boolean;
    isSecret: boolean;
    createdDate: string;
    latestDate: string;
    videoUrl?: string | null;
    duration?: string | null;
    secret?: boolean;
}

// 백엔드 ReadCommentRes (형님 말한 필드 기준)
// - createDate 로 내려옴
interface ReadCommentRes {
    commentNo: number;
    boardNo: number;
    commentWriter: string;
    commentContent: string;
    commentLikeCount: number;
    createDate?: string | null;
}

// 백엔드 PageResponseDTO 형태 (형님 프로젝트)
interface PageResponseDTO<T> {
    dtoList: T[];
    total: number;
    page: number;
    size: number;
    start: number;
    end: number;
    prev: boolean;
    next: boolean;
}

// 프론트에서 쓰는 댓글 모델
interface ContentComment {
    commentNo: number;
    memberNickname: string;
    memberProfileImageUrl?: string | null;
    content: string;
    createdAt: string; // 화면 출력용 (서버 createDate 매핑)
}

type ModalType = "REPORT" | "BLOCK" | null;

interface ModalState {
    type: ModalType;
    targetComment: ContentComment | null;
}

// ======================
// 유틸 함수
// ======================

// boardContent / videoUrl 에서 유튜브 URL 뽑기
function resolveRawVideoUrl(detail: ContentDetail): string | null {
    if (detail.videoUrl) return detail.videoUrl;

    if (!detail.boardContent) return null;
    const urlMatch = detail.boardContent.match(/https?:\/\/\S+/);
    return urlMatch ? urlMatch[0] : null;
}

// watch / youtu.be → embed URL
function toEmbedUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl) return null;
    try {
        const url = new URL(rawUrl);

        if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
            const v = url.searchParams.get("v");
            return `https://www.youtube.com/embed/${v}`;
        }

        if (url.hostname === "youtu.be") {
            const id = url.pathname.replace("/", "");
            return `https://www.youtube.com/embed/${id}`;
        }

        return rawUrl;
    } catch {
        return rawUrl;
    }
}

// "영상 URL: xxx" 라인 제거해서 요약 텍스트만
function extractSummary(boardContent: string | null | undefined): string {
    if (!boardContent) return "";
    const cleaned = boardContent.replace(/영상\s*URL\s*:\s*https?:\/\/\S+/gi, "");
    return cleaned.trim();
}

// 날짜 포맷
function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
}

// ======================
// 메인 컴포넌트
// ======================

export default function ContentDetailPage() {
    const params = useParams<{ boardNo: string }>();
    const boardNoStr = params.boardNo;
    const boardNo = Number(boardNoStr);

    const [content, setContent] = useState<ContentDetail | null>(null);
    const [loadingContent, setLoadingContent] = useState(true);

    const [comments, setComments] = useState<ContentComment[]>([]);
    const [commentPage, setCommentPage] = useState(0);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [totalCommentCount, setTotalCommentCount] = useState<number>(0);

    const [menuOpenedId, setMenuOpenedId] = useState<number | null>(null);
    const [modalState, setModalState] = useState<ModalState>({
        type: null,
        targetComment: null,
    });

    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    // 댓글 입력
    const [commentInput, setCommentInput] = useState("");
    const [posting, setPosting] = useState(false);

    // ========== 컨텐츠 상세 ==========
    useEffect(() => {
        if (!boardNoStr || Number.isNaN(boardNo)) return;

        const fetchDetail = async () => {
            try {
                setLoadingContent(true);
                const res = await apiClient.get<ApiResult<ContentDetail>>(`/board/${boardNo}`);

                if (!res.data.isSuccess) {
                    console.error("[content detail] 실패", res.data.resMessage);
                    return;
                }

                setContent(res.data.result);
            } catch (e) {
                console.error("[content detail] 에러", e);
            } finally {
                setLoadingContent(false);
            }
        };

        fetchDetail();
    }, [boardNoStr, boardNo]);

    // ========== 댓글 불러오기 ==========
    const fetchComments = async (page: number) => {
        if (!boardNoStr || Number.isNaN(boardNo)) return;
        if (loadingComments) return;

        try {
            setLoadingComments(true);

            // 첫 페이지면 초기화
            if (page === 0) {
                setComments([]);
                setHasMoreComments(true);
                setCommentPage(0);
            }

            const res = await apiClient.get<ApiResult<PageResponseDTO<ReadCommentRes>>>("/comment", {
                params: {
                    boardNo,
                    page,
                    size: 10,
                    sortBy: "commentNo",
                },
            });

            if (!res.data.isSuccess) {
                console.error("[comments] 실패", res.data.resMessage);
                setHasMoreComments(false);
                return;
            }

            const pageResult = res.data.result;
            const dtoList = pageResult?.dtoList ?? [];

            const mapped: ContentComment[] = dtoList.map((c) => ({
                commentNo: c.commentNo,
                memberNickname: c.commentWriter,
                memberProfileImageUrl: null, // 백엔드에서 아직 안 내려오면 null
                content: c.commentContent,
                createdAt: c.createDate ?? "", // 🔥 형님: createDate
            }));

            setTotalCommentCount(pageResult?.total ?? 0);

            setComments((prev) => {
                // page=0이면 교체, 그 외는 append
                if (page === 0) return mapped;
                // 중복 방지(혹시 모를)
                const seen = new Set(prev.map((x) => x.commentNo));
                const appended = mapped.filter((x) => !seen.has(x.commentNo));
                return [...prev, ...appended];
            });

            setCommentPage(page);
            setHasMoreComments(!!pageResult?.next);
        } catch (e) {
            console.error("[comments] 에러", e);
            setHasMoreComments(false);
        } finally {
            setLoadingComments(false);
        }
    };

    // 첫 페이지 댓글 로딩
    useEffect(() => {
        if (!boardNoStr || Number.isNaN(boardNo)) return;
        fetchComments(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardNoStr]);

    // IntersectionObserver (댓글 많아졌을 때 무한 스크롤용)
    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target) return;
        if (!hasMoreComments) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMoreComments && !loadingComments) {
                    fetchComments(commentPage + 1);
                }
            },
            { root: null, rootMargin: "0px", threshold: 1.0 }
        );

        observer.observe(target);

        return () => {
            observer.unobserve(target);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMoreComments, loadingComments, commentPage]);

    // ========== 댓글 작성 ==========
    const handleSubmitComment = async () => {
        const text = commentInput.trim();
        if (!text) return;
        if (!boardNoStr || Number.isNaN(boardNo)) return;

        try {
            setPosting(true);

            const res = await apiClient.post<ApiResult<any>>("/comment", {
                boardNo,
                commentContent: text,
            });

            if (!res.data.isSuccess) {
                alert(res.data.resMessage || "댓글 등록에 실패했습니다.");
                return;
            }

            setCommentInput("");
            // 작성 후 최신 목록으로 갱신
            await fetchComments(0);
        } catch (e: any) {
            // 401이면 로그인 필요
            console.error("[comment create] 에러", e);
            alert("댓글 등록에 실패했습니다. (로그인 상태/권한을 확인하세요)");
        } finally {
            setPosting(false);
        }
    };

    // ========== 메뉴 / 모달 ==========
    const openMenu = (commentNo: number) => {
        setMenuOpenedId((prev) => (prev === commentNo ? null : commentNo));
    };

    const openReportModal = (comment: ContentComment) => {
        setModalState({ type: "REPORT", targetComment: comment });
        setMenuOpenedId(null);
    };

    const openBlockModal = (comment: ContentComment) => {
        setModalState({ type: "BLOCK", targetComment: comment });
        setMenuOpenedId(null);
    };

    const closeModal = () => {
        setModalState({ type: null, targetComment: null });
    };

    const handleConfirmReport = async () => {
        if (!modalState.targetComment) return;
        try {
            await apiClient.post(`/board/comments/${modalState.targetComment.commentNo}/report`);
        } catch (e) {
            console.error("신고 에러", e);
        } finally {
            closeModal();
        }
    };

    const handleConfirmBlock = async () => {
        if (!modalState.targetComment) return;
        try {
            await apiClient.post(`/member/block`, {
                nickname: modalState.targetComment.memberNickname,
            });
        } catch (e) {
            console.error("차단 에러", e);
        } finally {
            closeModal();
        }
    };

    // ========== 로딩 / 에러 ==========
    if (loadingContent && !content) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black text-sm text-zinc-300">
                컨텐츠 불러오는 중...
            </div>
        );
    }

    if (!content) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black text-sm text-zinc-300">
                컨텐츠를 찾을 수 없습니다.
            </div>
        );
    }

    const rawVideoUrl = resolveRawVideoUrl(content);
    const embedUrl = toEmbedUrl(rawVideoUrl);
    const summary = extractSummary(content.boardContent);

    return (
        <>
            {/* 헤더 높이를 56px로 보고, 그 아래 영역 전체를 고정 */}
            <div className="fixed inset-x-0 bottom-0 top-[56px] bg-black text-white">
                <div className="flex h-full">
                    {/* ========== 왼쪽 : 영상/제목/요약 (독립 스크롤) ========== */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex min-h-full flex-col items-center">
                            {/* 영상 영역 */}
                            <div className="flex w-full justify-center">
                                <div className="w-full max-w-[1500px] aspect-[1500/675] bg-black">
                                    {embedUrl ? (
                                        <iframe
                                            className="h-full w-full"
                                            src={embedUrl}
                                            title={content.boardTitle}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                                            영상 URL이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 제목 / 날짜 / 요약 */}
                            <div className="mt-6 flex w-full max-w-[1500px] flex-col px-6 pb-6">
                                <h1 className="text-2xl font-semibold text-white">{content.boardTitle ?? "제목 없음"}</h1>

                                <p className="mt-1 text-sm font-medium text-zinc-400">{formatDate(content.createdDate)}</p>

                                {summary && (
                                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{summary}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ========== 오른쪽 : 댓글 패널 (독립 스크롤) ========== */}
                    <div className="flex w-[420px] flex-col border-l border-zinc-800 bg-black">
                        {/* 헤더 + 입력 박스 */}
                        <div className="border-b border-zinc-800 px-4 py-3">
                            <div className="mb-2 text-xs text-zinc-300">
                                댓글 {totalCommentCount.toLocaleString("ko-KR")}
                            </div>

                            {/* 입력 */}
                            <div className="flex gap-2">
                                <input
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    placeholder="댓글 추가하기…"
                                    className="h-10 flex-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmitComment();
                                        }
                                    }}
                                    disabled={posting}
                                />
                                <button
                                    type="button"
                                    onClick={handleSubmitComment}
                                    disabled={posting || !commentInput.trim()}
                                    className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-700"
                                >
                                    {posting ? "등록중" : "등록"}
                                </button>
                            </div>

                            <p className="mt-2 text-[11px] text-zinc-500">
                                Enter로 등록 (Shift+Enter 줄바꿈)
                            </p>
                        </div>

                        {/* 댓글 리스트 */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.commentNo} className="relative flex gap-3 text-sm">
                                        <div className="mt-1 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-zinc-700">
                                            {comment.memberProfileImageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={comment.memberProfileImageUrl}
                                                    alt={comment.memberNickname}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-200">
                                                    {comment.memberNickname?.[0] ?? "?"}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div>
                          <span className="text-xs font-semibold text-zinc-100">
                            {comment.memberNickname}
                          </span>
                                                    <span className="ml-2 text-[11px] text-zinc-500">
                            {formatDate(comment.createdAt)}
                          </span>
                                                </div>

                                                {/* 점3개 메뉴 */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => openMenu(comment.commentNo)}
                                                        className="rounded-full px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-800"
                                                    >
                                                        ⋯
                                                    </button>

                                                    {menuOpenedId === comment.commentNo && (
                                                        <div className="absolute right-0 top-6 w-40 rounded-md border border-zinc-700 bg-zinc-900/95 text-xs shadow-lg">
                                                            <button
                                                                type="button"
                                                                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
                                                                onClick={() => openReportModal(comment)}
                                                            >
                                                                신고하기
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="block w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-800"
                                                                onClick={() => openBlockModal(comment)}
                                                            >
                                                                이 회원 차단하기
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* sentinel */}
                                <div ref={loadMoreRef} className="h-8" />

                                {loadingComments && (
                                    <div className="py-2 text-center text-xs text-zinc-500">
                                        댓글 불러오는 중…
                                    </div>
                                )}

                                {!loadingComments && comments.length === 0 && (
                                    <div className="py-6 text-center text-xs text-zinc-500">아직 댓글이 없습니다.</div>
                                )}

                                {!hasMoreComments && comments.length > 0 && (
                                    <div className="py-4 text-center text-xs text-zinc-500">모든 댓글을 다 봤습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 신고 모달 */}
            {modalState.type === "REPORT" && modalState.targetComment && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-md rounded-md bg-zinc-900 p-6 text-center shadow-xl">
                        <p className="text-sm font-semibold text-zinc-100">이 댓글을 신고할까요?</p>
                        <p className="mt-3 text-xs text-zinc-400">
                            신고 내용은 운영진이 확인 후 필요한 조치를 취합니다.
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 rounded-md bg-zinc-700 py-2 text-sm text-zinc-100 hover:bg-zinc-600"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReport}
                                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                신고하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 차단 모달 */}
            {modalState.type === "BLOCK" && modalState.targetComment && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-md rounded-md bg-zinc-900 p-6 text-center shadow-xl">
                        <p className="text-sm font-semibold text-zinc-100">
                            {modalState.targetComment.memberNickname} 님을 차단할까요?
                        </p>
                        <p className="mt-3 text-xs text-zinc-400">이 회원이 작성한 글을 모두 보지 않게 됩니다.</p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 rounded-md bg-zinc-700 py-2 text-sm text-zinc-100 hover:bg-zinc-600"
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBlock}
                                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                차단하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
