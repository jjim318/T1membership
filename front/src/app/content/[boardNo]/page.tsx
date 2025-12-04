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
}

// 댓글 DTO (나중에 백엔드랑 맞추면 됨)
interface ContentComment {
    commentNo: number;
    memberNickname: string;
    memberProfileImageUrl?: string | null;
    content: string;
    createdAt: string;
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
    const cleaned = boardContent.replace(
        /영상\s*URL\s*:\s*https?:\/\/\S+/gi,
        "",
    );
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
    const boardNo = params.boardNo;

    const [content, setContent] = useState<ContentDetail | null>(null);
    const [loadingContent, setLoadingContent] = useState(true);

    const [comments, setComments] = useState<ContentComment[]>([]);
    const [commentPage, setCommentPage] = useState(0);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [totalCommentCount, setTotalCommentCount] = useState<number | null>(
        null,
    );

    const [menuOpenedId, setMenuOpenedId] = useState<number | null>(null);
    const [modalState, setModalState] = useState<ModalState>({
        type: null,
        targetComment: null,
    });

    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    // ========== 컨텐츠 상세 ==========
    useEffect(() => {
        if (!boardNo) return;

        const fetchDetail = async () => {
            try {
                setLoadingContent(true);
                const res = await apiClient.get<ApiResult<ContentDetail>>(
                    `/board/${boardNo}`,
                );

                if (!res.data.isSuccess) {
                    console.error("[content detail] 실패", res.data.resMessage);
                    return;
                }

                console.log("[content detail] raw result =", res.data.result); // 🔥 여기

                setContent(res.data.result);
            } catch (e) {
                console.error("[content detail] 에러", e);
            } finally {
                setLoadingContent(false);
            }
        };

        fetchDetail();
    }, [boardNo]);

    // ========== 댓글 불러오기 ==========
    // 👉 지금은 백엔드에 /board/{boardNo}/comments 없으니까
    //    실제 호출은 막아두고, 구조만 유지
    const fetchComments = async (page: number) => {
        if (!boardNo) return;

        if (page === 0) {
            setComments([]);
            setTotalCommentCount(0);
        }

        setHasMoreComments(false);
        setLoadingComments(false);
    };

    // 첫 페이지 댓글 로딩
    useEffect(() => {
        if (!boardNo) return;
        fetchComments(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardNo]);

    // IntersectionObserver (댓글 많아졌을 때 무한 스크롤용)
    useEffect(() => {
        if (!loadMoreRef.current) return;
        if (!hasMoreComments) return;
        if (comments.length === 0) return;

        const target = loadMoreRef.current;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMoreComments && !loadingComments) {
                    fetchComments(commentPage + 1);
                }
            },
            { root: null, rootMargin: "0px", threshold: 1.0 },
        );

        observer.observe(target);

        return () => {
            observer.unobserve(target);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMoreComments, loadingComments, commentPage, comments.length]);

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
            await apiClient.post(
                `/board/comments/${modalState.targetComment.commentNo}/report`,
            );
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

    // ======================
    // 레이아웃:
    // - 이 컴포넌트 전체를 헤더 아래에 fixed 로 붙여서
    //   문서 자체 스크롤은 아예 없애고
    //   좌/우 영역만 overflow-y 로 스크롤되게 함
    // ======================

    return (
        <>
            {/* 헤더 높이를 대충 64px 로 보고, 그 아래 영역 전체를 고정 */}
            <div className="fixed inset-x-0 bottom-0 top-[56px] bg-black text-white">
                <div className="flex h-full">
                    {/* ========== 왼쪽 : 영상/제목/요약 (독립 스크롤) ========== */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex min-h-full flex-col items-center">
                            {/* 영상 영역 (가운데 정렬 + 1500x675 비율) */}
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

                                {/* 제목 */}
                                <h1 className="text-2xl font-semibold text-white">
                                    {content.boardTitle ?? "제목 없음"}
                                </h1>

                                {/* 🔥 등록 날짜 (확실하게 보이도록 스타일 업) */}
                                <p className="mt-1 text-sm font-medium text-zinc-400">
                                    {formatDate(content.createdDate)}
                                </p>

                                {/* 요약 텍스트 */}
                                {summary && (
                                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                                        {summary}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ========== 오른쪽 : 댓글 패널 (독립 스크롤) ========== */}
                    <div className="flex w-[420px] flex-col border-l border-zinc-800 bg-black">
                        {/* 헤더 + 입력 박스 (위에 고정) */}
                        <div className="border-b border-zinc-800 px-4 py-3">
                            <div className="mb-2 text-xs text-zinc-300">
                                댓글{" "}
                                {totalCommentCount !== null
                                    ? totalCommentCount.toLocaleString("ko-KR")
                                    : 0}
                            </div>
                            <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-400">
                                댓글 추가하기…
                            </div>
                        </div>

                        {/* 댓글 리스트 (여기가 스크롤) */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div
                                        key={comment.commentNo}
                                        className="relative flex gap-3 text-sm"
                                    >
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
                                                    {comment.memberNickname?.[0] ??
                                                        "?"}
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
                                                        {formatDate(
                                                            comment.createdAt,
                                                        )}
                                                    </span>
                                                </div>

                                                {/* 점3개 메뉴 */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openMenu(
                                                                comment.commentNo,
                                                            )
                                                        }
                                                        className="rounded-full px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-800"
                                                    >
                                                        ⋯
                                                    </button>

                                                    {menuOpenedId ===
                                                        comment.commentNo && (
                                                            <div className="absolute right-0 top-6 w-40 rounded-md border border-zinc-700 bg-zinc-900/95 text-xs shadow-lg">
                                                                <button
                                                                    type="button"
                                                                    className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
                                                                    onClick={() =>
                                                                        openReportModal(
                                                                            comment,
                                                                        )
                                                                    }
                                                                >
                                                                    신고하기
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="block w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-800"
                                                                    onClick={() =>
                                                                        openBlockModal(
                                                                            comment,
                                                                        )
                                                                    }
                                                                >
                                                                    이 회원 차단하기
                                                                </button>
                                                            </div>
                                                        )}
                                                </div>
                                            </div>

                                            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {/* 무한 스크롤 sentinel */}
                                <div ref={loadMoreRef} className="h-8" />

                                {loadingComments && (
                                    <div className="py-2 text-center text-xs text-zinc-500">
                                        댓글 불러오는 중…
                                    </div>
                                )}

                                {!loadingComments && comments.length === 0 && (
                                    <div className="py-6 text-center text-xs text-zinc-500">
                                        아직 댓글이 없습니다.
                                    </div>
                                )}

                                {!hasMoreComments && comments.length > 0 && (
                                    <div className="py-4 text-center text-xs text-zinc-500">
                                        모든 댓글을 다 봤습니다.
                                    </div>
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
                        <p className="text-sm font-semibold text-zinc-100">
                            이 댓글을 신고할까요?
                        </p>
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
                        <p className="mt-3 text-xs text-zinc-400">
                            이 회원이 작성한 글을 모두 보지 않게 됩니다.
                        </p>

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
