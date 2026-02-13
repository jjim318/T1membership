// src/app/admin/content/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// contents 메인에서 쓰던 카테고리 key와 맞춰서 사용
type ContentCategoryKey =
    | "ONWORLD_T1"
    | "T_HIND"
    | "TTIME"
    | "GREETINGS"
    | "ROAD_TO_THE_STAR"
    | "WITH_ONE_VOICE"
    | "EVENT"
    | "NOTICE"
    | "MESSAGE";

const CATEGORY_OPTIONS: { value: ContentCategoryKey; label: string }[] = [
    { value: "ONWORLD_T1", label: "온세상이T1" },
    { value: "T_HIND", label: "T-hind" },
    { value: "TTIME", label: "T1me" },
    { value: "GREETINGS", label: "Greetings" },
    { value: "ROAD_TO_THE_STAR", label: "Road to the Star" },
    { value: "WITH_ONE_VOICE", label: "With One Voice" },
    { value: "EVENT", label: "Event" },
    { value: "NOTICE", label: "Notice" },
    { value: "MESSAGE", label: "Message from T1" },
];

export default function AdminContentCreatePage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [category, setCategory] =
        useState<ContentCategoryKey>("ONWORLD_T1");
    const [seriesName, setSeriesName] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [summary, setSummary] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (submitting) return;

        if (!title.trim()) {
            alert("제목은 필수입니다.");
            return;
        }
        if (!videoUrl.trim()) {
            alert("영상 URL은 필수입니다.");
            return;
        }

        try {
            setSubmitting(true);

            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("category", category);
            if (seriesName.trim()) {
                formData.append("seriesName", seriesName.trim());
            }
            formData.append("videoUrl", videoUrl.trim());
            if (summary.trim()) {
                formData.append("summary", summary.trim());
            }
            formData.append("isPublic", String(isPublic));

            if (thumbnailFile) {
                formData.append("thumbnail", thumbnailFile);
            }

            const res = await apiClient.post("/board/content", formData);
            console.log("[컨텐츠 등록 완료]", res.data);

            alert("컨텐츠가 등록되었습니다.");
            router.push("/content");
        } catch (err) {
            console.error("[컨텐츠 등록 실패]", err);
            alert("컨텐츠 등록 중 오류가 발생했습니다. 콘솔 로그를 확인해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-50">
            <main className="mx-auto max-w-3xl px-4 pb-16 pt-10">
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="text-lg font-semibold">컨텐츠 등록</h1>
                    <button
                        type="button"
                        onClick={() => router.push("/content")}
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                        ← 콘텐츠 목록으로
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-6"
                >
                    {/* 제목 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-200">
                            제목 *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500"
                            placeholder="예) 2025 Greetings | Gumayusi"
                        />
                    </div>

                    {/* 카테고리 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-200">
                            카테고리 *
                        </label>
                        <select
                            value={category}
                            onChange={(e) =>
                                setCategory(
                                    e.target.value as ContentCategoryKey,
                                )
                            }
                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500"
                        >
                            {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 시리즈명 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-200">
                            시리즈 / 라인업 이름 (선택)
                        </label>
                        <input
                            type="text"
                            value={seriesName}
                            onChange={(e) => setSeriesName(e.target.value)}
                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500"
                            placeholder="예) T-hind, Road to the Star, 2025 Greetings 등"
                        />
                    </div>

                    {/* 영상 URL */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-200">
                            영상 URL (예: S3 / CDN / YouTube 등) *
                        </label>
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500"
                            placeholder="https://..."
                        />
                    </div>

                    {/* 요약 설명 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-200">
                            요약 설명 (선택)
                        </label>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="h-24 w-full resize-none rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500"
                            placeholder="간단한 설명을 입력해주세요."
                        />
                    </div>

                    {/* 썸네일 업로드 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-200">
                            썸네일 이미지 (선택)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setThumbnailFile(file);
                            }}
                            className="w-full text-[11px] text-zinc-300"
                        />
                        <p className="text-[11px] text-zinc-500">
                            업로드하지 않으면 기본 플레이스홀더가 사용되도록 백엔드에서
                            처리하면 됩니다.
                        </p>
                    </div>

                    {/* 공개 여부 */}
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            id="public"
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-600 bg-black text-red-500"
                        />
                        <label
                            htmlFor="public"
                            className="text-xs text-zinc-200"
                        >
                            공개 컨텐츠로 등록
                        </label>
                    </div>

                    {/* 버튼 */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex h-10 w-full items-center justify-center rounded-md bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-300"
                        >
                            {submitting ? "등록 중..." : "컨텐츠 등록"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
