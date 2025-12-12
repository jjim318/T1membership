"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

type ApiResult<T> = {
    isSuccess: boolean;
    resCode: number | string;
    resMessage: string | null;
    result: T;
};

// 백엔드 CreateStoryReq
interface CreateStoryReq {
    title: string;
    content: string;
    locked: boolean;
}

function cx(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

async function createStory(req: CreateStoryReq) {
    const res = await apiClient.post<ApiResult<null>>("/boards/story", req);
    if (!res.data.isSuccess) {
        throw new Error(res.data.resMessage || "작성에 실패했습니다.");
    }
}

export default function StoryWritePage() {
    const router = useRouter();
    const sp = useSearchParams();

    // ✅ 어떤 채널에서 “글쓰기” 눌렀는지 전달받음
    const player = (sp.get("player") ?? "T1").trim() || "T1";

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [locked, setLocked] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        return title.trim().length > 0 && content.trim().length > 0 && !submitting;
    }, [title, content, submitting]);

    const goBack = () => {
        router.push(`/story/feed?player=${encodeURIComponent(player)}`);
    };

    const submit = async () => {
        if (!title.trim()) return setErr("제목을 입력하세요.");
        if (!content.trim()) return setErr("내용을 입력하세요.");

        setErr(null);
        setSubmitting(true);

        try {
            await createStory({
                title: title.trim(),
                content: content.trim(),
                locked,
            });

            // ✅ 작성 성공 → 해당 채널 피드로 복귀
            router.push(`/story/feed?player=${encodeURIComponent(player)}`);
        } catch (e) {
            const ex = e as AxiosError<any>;
            const msg =
                ex.response?.data?.resMessage ||
                ex.response?.data?.message ||
                (e as Error).message ||
                "작성 실패(권한/로그인/서버 로그 확인)";
            setErr(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-3xl px-4 py-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                        <div className="text-xl font-bold">스토리 작성</div>
                        <div className="mt-1 text-xs text-white/50">
                            현재 채널: <span className="text-white/80 font-semibold">{player}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={goBack}
                        className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 text-xs font-semibold text-white/90"
                    >
                        취소
                    </button>
                </div>

                <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
                    {err ? (
                        <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {err}
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <div>
                            <div className="mb-1 text-xs text-white/50">제목</div>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/25"
                                placeholder="제목을 입력하세요"
                                maxLength={80}
                            />
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-white/50">내용</div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[220px] w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/25"
                                placeholder="내용을 입력하세요"
                                maxLength={2000}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-white/80">
                            <input
                                type="checkbox"
                                checked={locked}
                                onChange={(e) => setLocked(e.target.checked)}
                            />
                            멤버십 전용(잠금)
                        </label>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={goBack}
                            className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 text-xs font-semibold"
                            disabled={submitting}
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!canSubmit}
                            className={cx(
                                "rounded-full px-6 py-2 text-xs font-bold",
                                canSubmit
                                    ? "bg-white text-black hover:bg-white/90"
                                    : "bg-white/20 text-white/40 cursor-not-allowed"
                            )}
                        >
                            {submitting ? "작성 중…" : "작성하기"}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
