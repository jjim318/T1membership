// src/app/admin/content/manage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// ===== 타입들 (기존 /board/content 응답이랑 맞춤) =====
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface BackendContent {
    boardNo: number;
    boardTitle: string;
    categoryCode: string;
    thumbnailUrl?: string | null;
    createdAt?: string | null;
}

// 편의용 타입
interface EditForm {
    boardNo: number | null;
    boardTitle: string;
    categoryCode: string;
    thumbnailUrl: string; // 백엔드에 저장되는 값 (/files/uuid.jpg 등)
}

interface DeleteBoardRes {
    boardNo: number; // 실제 응답 필드에 맞게 필요하면 더 추가
}

function formatDateLabel(dateStr?: string | null): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}.${m}.${day}`;
}

export default function AdminContentManagePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [contents, setContents] = useState<BackendContent[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<EditForm>({
        boardNo: null,
        boardTitle: "",
        categoryCode: "",
        thumbnailUrl: "",
    });

    // 🔥 썸네일 업로드/미리보기용 상태
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // 🔥 파일 베이스 URL (ex. http://localhost:8080)
    const API_BASE =
        (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

    // ===== 전체 컨텐츠 목록 불러오기 =====
    useEffect(() => {
        const fetchContents = async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const res = await apiClient.get<ApiResult<BackendContent[]>>(
                    "/board/content",
                );

                if (!res.data.isSuccess) {
                    setErrorMsg(res.data.resMessage || "컨텐츠 목록 로딩 실패");
                    return;
                }

                setContents(res.data.result ?? []);
            } catch (e) {
                console.error("[ADMIN CONTENT MANAGE] load error", e);
                setErrorMsg("컨텐츠 목록 호출 실패");
            } finally {
                setLoading(false);
            }
        };

        fetchContents();
    }, []);

    // 공통: 파일 선택 시 상태 세팅 + 미리보기 생성
    const selectThumbnailFile = (file: File) => {
        setThumbnailFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // 🔥 목록에서 하나 선택했을 때, 오른쪽 폼에 채워넣기
    const handleSelect = (item: BackendContent) => {
        setSelectedId(item.boardNo);

        const rawThumb = item.thumbnailUrl || "";
        const resolvedThumb =
            rawThumb && !rawThumb.startsWith("http")
                ? `${API_BASE}${rawThumb}`
                : rawThumb || null;

        setForm({
            boardNo: item.boardNo,
            boardTitle: item.boardTitle,
            categoryCode: item.categoryCode,
            thumbnailUrl: rawThumb, // 백엔드 원본 값 그대로 (/files/uuid.jpg 형태)
        });

        // 기존 썸네일을 미리보기로 띄워줌
        setPreviewUrl(resolvedThumb);
        setThumbnailFile(null); // 새 파일은 아직 없음
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // 🔥 파일 input change
    const handleThumbnailFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        selectThumbnailFile(file);
    };

    // 🔥 드래그앤드롭 핸들러들
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        selectThumbnailFile(file);
    };

    // 🔥 수정 저장
    const handleSave = async () => {
        if (!form.boardNo) return;
        try {
            setSaving(true);
            setErrorMsg(null);

            let finalThumbUrl = form.thumbnailUrl; // 기본값: 기존 것 그대로

            // 1) 새 파일이 선택돼 있으면 먼저 업로드
            if (thumbnailFile) {
                const fd = new FormData();
                fd.append("file", thumbnailFile);

                // ⚠️ 업로드 엔드포인트는
                //     "컨텐츠 등록 페이지에서 쓰는 것과 똑같이"
                //     맞춰주세요.
                const uploadRes = await apiClient.post<
                    ApiResult<string>
                >("/files/upload", fd, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });

                if (!uploadRes.data.isSuccess) {
                    setErrorMsg(
                        uploadRes.data.resMessage || "썸네일 업로드 실패",
                    );
                    setSaving(false);
                    return;
                }

                // ex) "/files/uuid.jpg"
                finalThumbUrl = uploadRes.data.result;
            }

            // 2) 실제 글 수정
            const res = await apiClient.put<ApiResult<BackendContent>>(
                `/admin/board/${form.boardNo}`,
                {
                    boardTitle: form.boardTitle,
                    categoryCode: form.categoryCode,
                    thumbnailUrl: finalThumbUrl || null,
                },
            );

            if (!res.data.isSuccess) {
                setErrorMsg(res.data.resMessage || "수정 실패");
                return;
            }

            // 3) 로컬 목록 반영
            setContents((prev) =>
                prev.map((c) =>
                    c.boardNo === form.boardNo
                        ? {
                            ...c,
                            boardTitle: form.boardTitle,
                            categoryCode: form.categoryCode,
                            thumbnailUrl: finalThumbUrl || null,
                        }
                        : c,
                ),
            );

            // 업로드 성공 후 상태 초기화 (form에는 새 URL 유지)
            setForm((prev) => ({
                ...prev,
                thumbnailUrl: finalThumbUrl,
            }));
            setThumbnailFile(null);

            alert("컨텐츠가 수정되었습니다.");
        } catch (e) {
            console.error("[ADMIN CONTENT MANAGE] save error", e);
            setErrorMsg("컨텐츠 수정 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // 🔥 삭제
    const handleDelete = async () => {
        if (!form.boardNo) return;
        if (!confirm("정말 이 컨텐츠를 삭제하시겠습니까?")) return;

        try {
            setDeleting(true);
            setErrorMsg(null);

            const res = await apiClient.delete<ApiResult<DeleteBoardRes>>(
                `/board/${form.boardNo}`,
            );

            if (!res.data.isSuccess) {
                setErrorMsg(res.data.resMessage || "삭제 실패");
                return;
            }

            setContents((prev) =>
                prev.filter((c) => c.boardNo !== form.boardNo),
            );
            setSelectedId(null);
            setForm({
                boardNo: null,
                boardTitle: "",
                categoryCode: "",
                thumbnailUrl: "",
            });
            setThumbnailFile(null);
            setPreviewUrl(null);

            alert("컨텐츠가 삭제되었습니다.");
        } catch (e) {
            console.error("[ADMIN CONTENT MANAGE] delete error", e);
            setErrorMsg("컨텐츠 삭제 중 오류가 발생했습니다.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-50">
            <main className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">
                            컨텐츠 수정/삭제
                        </h1>
                        <p className="mt-1 text-xs text-zinc-400">
                            좌측 목록에서 컨텐츠를 선택한 뒤,
                            우측에서 제목/썸네일 등을 수정하거나 삭제할 수 있습니다.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/admin/content")}
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                        + 새 컨텐츠 등록
                    </button>
                </div>

                {errorMsg && (
                    <div className="mb-4 rounded-lg bg-red-900/40 px-4 py-2 text-xs text-red-300">
                        {errorMsg}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    {/* ===== 좌측: 컨텐츠 목록 ===== */}
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60">
                        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                컨텐츠 목록
                            </h2>
                            {loading && (
                                <span className="text-[11px] text-zinc-400">
                                    불러오는 중…
                                </span>
                            )}
                        </div>

                        <div className="max-h-[520px] divide-y divide-zinc-800 overflow-y-auto">
                            {contents.length === 0 && !loading && (
                                <div className="px-4 py-6 text-[12px] text-zinc-500">
                                    등록된 컨텐츠가 없습니다.
                                </div>
                            )}

                            {contents.map((item) => {
                                const isActive = item.boardNo === selectedId;

                                const rawThumb =
                                    item.thumbnailUrl || "/content/no-thumb.jpg";
                                const resolvedThumb = rawThumb.startsWith(
                                    "http",
                                )
                                    ? rawThumb
                                    : `${API_BASE}${rawThumb}`;

                                return (
                                    <button
                                        key={item.boardNo}
                                        type="button"
                                        onClick={() => handleSelect(item)}
                                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] transition-colors ${
                                            isActive
                                                ? "bg-zinc-800"
                                                : "hover:bg-zinc-900/60"
                                        }`}
                                    >
                                        {/* 썸네일 미리보기 (작게) */}
                                        <div className="relative h-12 w-20 overflow-hidden rounded-md bg-zinc-900">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={resolvedThumb}
                                                alt={item.boardTitle}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="line-clamp-1 font-medium">
                                                {item.boardTitle}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-zinc-400">
                                                #{item.categoryCode ?? "—"} ·{" "}
                                                {formatDateLabel(
                                                    item.createdAt,
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* ===== 우측: 수정/삭제 폼 ===== */}
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <h2 className="mb-4 text-sm font-semibold">
                            선택한 컨텐츠 수정/삭제
                        </h2>

                        {!form.boardNo ? (
                            <p className="text-[12px] text-zinc-500">
                                좌측에서 수정할 컨텐츠를 먼저 선택해 주세요.
                            </p>
                        ) : (
                            <div className="space-y-4 text-[13px]">
                                <div>
                                    <label className="mb-1 block text-[11px] text-zinc-400">
                                        게시글 번호 (읽기 전용)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.boardNo}
                                        disabled
                                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[12px] text-zinc-300"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] text-zinc-400">
                                        제목
                                    </label>
                                    <input
                                        type="text"
                                        name="boardTitle"
                                        value={form.boardTitle}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-100 outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] text-zinc-400">
                                        카테고리 코드
                                    </label>
                                    <input
                                        type="text"
                                        name="categoryCode"
                                        value={form.categoryCode}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-100 outline-none focus:border-zinc-400"
                                    />
                                    <p className="mt-1 text-[11px] text-zinc-500">
                                        예: ONWORLD_T1, T_HIND, TTIME, NOTICE
                                        등 (백엔드 Enum에 맞춰 입력)
                                    </p>
                                </div>

                                {/* 🔥 썸네일 업로드 + 드래그앤드롭 영역 */}
                                <div>
                                    <label className="mb-1 block text-[11px] text-zinc-400">
                                        썸네일 이미지 업로드
                                    </label>

                                    {/* 파일 input */}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailFileChange}
                                        className="block w-full cursor-pointer text-[12px] text-zinc-300
                                        file:mr-3 file:rounded file:border-0
                                        file:bg-zinc-800 file:px-3 file:py-1.5
                                        file:text-zinc-200 hover:file:bg-zinc-700"
                                    />

                                    {/* 드래그앤드롭 박스 */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`mt-2 flex h-24 items-center justify-center rounded-xl border text-[11px] transition-colors ${
                                            isDragging
                                                ? "border-red-500 bg-red-500/10"
                                                : "border-dashed border-zinc-700 bg-zinc-900/60"
                                        }`}
                                    >
                                        <span className="text-zinc-400">
                                            이 영역으로 이미지를 드래그앤드롭 하거나,
                                            위의 파일 선택 버튼을 사용하세요.
                                        </span>
                                    </div>

                                    {/* 미리보기 */}
                                    {previewUrl && (
                                        <div className="mt-2">
                                            <p className="mb-1 text-[11px] text-zinc-400">
                                                미리보기
                                            </p>
                                            <div className="relative h-32 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={previewUrl}
                                                    alt="thumbnail preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="rounded-full border border-red-700 px-4 py-2 text-[12px] font-semibold text-red-300 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {deleting ? "삭제 중..." : "컨텐츠 삭제"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="rounded-full bg-zinc-200 px-4 py-2 text-[12px] font-semibold text-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving ? "저장 중..." : "수정 내용 저장"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
