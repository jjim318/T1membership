"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";

// window.YT 타입 선언 (간단히 any로 처리)
declare global {
    interface Window {
        YT?: any;
        onYouTubeIframeAPIReady?: () => void;
    }
}

// 🔥 실제 서버 경로에 맞게 이 부분만 바꿔주세요.
const CONTENT_CREATE_URL = "/api/board/content";

type FormState = {
    title: string;
    category: string;
    seriesName: string;
    videoUrl: string;
    summary: string;
    isPublic: boolean;
};

export default function AdminContentNewPage() {
    const [form, setForm] = useState<FormState>({
        title: "",
        category: "",
        seriesName: "",
        videoUrl: "",
        summary: "",
        isPublic: true,
    });

    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    // ====== 유튜브 길이 관련 상태 ======
    const [duration, setDuration] = useState<string | null>(null);
    const [durationLoading, setDurationLoading] = useState(false);
    const [durationError, setDurationError] = useState<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    const playerRef = useRef<any | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ============================
    // 1) YouTube iframe API 스크립트 로딩
    // ============================
    useEffect(() => {
        if (typeof window === "undefined") return;

        // 이미 로드된 경우
        if (window.YT && window.YT.Player) {
            setScriptLoaded(true);
            return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;

        window.onYouTubeIframeAPIReady = () => {
            setScriptLoaded(true);
        };

        document.body.appendChild(tag);

        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    // ============================
    // 2) 기본 input 변경 핸들러
    // ============================
    const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));

        if (field === "videoUrl" && typeof value === "string") {
            handleYoutubeUrlChange(value);
        }
    };

    // ============================
    // 3) 유튜브 URL 변경 → debounce 후 길이 계산 시도
    // ============================
    const handleYoutubeUrlChange = (url: string) => {
        setDuration(null);
        setDurationError(null);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!url || url.trim() === "") {
            return;
        }

        debounceTimerRef.current = setTimeout(() => {
            tryDetectDuration(url);
        }, 700);
    };

    // ============================
    // 4) URL → videoId 추출
    // ============================
    const extractVideoId = (youtubeUrl: string): string | null => {
        try {
            if (youtubeUrl.includes("youtu.be/")) {
                const idx = youtubeUrl.indexOf("youtu.be/") + "youtu.be/".length;
                const rest = youtubeUrl.substring(idx);
                const qIdx = rest.indexOf("?");
                return qIdx > -1 ? rest.substring(0, qIdx) : rest;
            }

            if (youtubeUrl.includes("watch?v=")) {
                const urlObj = new URL(youtubeUrl);
                return urlObj.searchParams.get("v");
            }

            if (youtubeUrl.includes("/embed/")) {
                const parts = youtubeUrl.split("/embed/");
                const rest = parts[1];
                const qIdx = rest.indexOf("?");
                return qIdx > -1 ? rest.substring(0, qIdx) : rest;
            }

            return null;
        } catch {
            return null;
        }
    };

    // ============================
    // 5) 초 → "mm:ss" 또는 "HH:mm:ss" 포맷
    // ============================
    const formatDuration = (seconds: number): string => {
        if (!seconds || seconds <= 0) return "00:00";

        const total = Math.floor(seconds);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
        } else {
            return `${minutes.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
        }
    };

    // ============================
    // 6) YT.Player 만들어서 duration 가져오기
    // ============================
    const tryDetectDuration = (youtubeUrl: string) => {
        if (!scriptLoaded) {
            setDurationError("유튜브 플레이어 스크립트를 아직 불러오는 중입니다.");
            return;
        }

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            setDurationError("유효한 유튜브 주소가 아닙니다.");
            return;
        }

        setDurationLoading(true);
        setDurationError(null);
        setDuration(null);

        // 기존 플레이어 정리
        if (playerRef.current) {
            try {
                playerRef.current.destroy();
            } catch {
                // ignore
            }
            playerRef.current = null;
        }

        playerRef.current = new window.YT.Player("hidden-youtube-player", {
            videoId,
            events: {
                onReady: (event: any) => {
                    // 🔥 여기서 바로 읽지 말고, 0초 아니게 나올 때까지 폴링
                    let tries = 0;
                    const maxTries = 10; // 10번 * 500ms = 최대 5초 대기

                    const poll = () => {
                        try {
                            const sec = event.target.getDuration();
                            // 아직 메타데이터 안 뜬 경우
                            if (!sec || sec <= 0) {
                                tries++;
                                if (tries >= maxTries) {
                                    setDurationError("영상 길이를 가져오는 데 실패했습니다.");
                                    setDurationLoading(false);
                                    return;
                                }
                                setTimeout(poll, 500); // 0.5초 후 재시도
                                return;
                            }

                            const formatted = formatDuration(sec);
                            setDuration(formatted);
                            setDurationLoading(false);
                        } catch (e) {
                            console.error(e);
                            setDurationError("영상 길이를 가져오는 중 오류가 발생했습니다.");
                            setDurationLoading(false);
                        }
                    };

                    poll();
                },
                onError: () => {
                    setDurationError("유튜브 영상을 불러오는 중 오류가 발생했습니다.");
                    setDurationLoading(false);
                },
            },
        });
    };


    // ============================
    // 7) 썸네일 파일 선택
    // ============================
    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailFile(file);
        } else {
            setThumbnailFile(null);
        }
    };

    // ============================
    // 8) 폼 제출 → multipart/form-data 전송
    // ============================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const formData = new FormData();
            formData.append("title", form.title);
            formData.append("category", form.category);
            formData.append("videoUrl", form.videoUrl);
            formData.append("summary", form.summary);
            formData.append("isPublic", String(form.isPublic));

            if (form.seriesName) {
                formData.append("seriesName", form.seriesName);
            }

            // 🔥 자동 감지된 duration 넘기기 (없으면 빈 문자열)
            formData.append("duration", duration ?? "");

            if (thumbnailFile) {
                formData.append("thumbnail", thumbnailFile);
            }

            await apiClient.post(CONTENT_CREATE_URL, formData, {
                // Content-Type은 axios가 FormData로 자동 설정하므로 수동 설정 X
            });

            alert("컨텐츠가 등록되었습니다.");

            setForm({
                title: "",
                category: "",
                seriesName: "",
                videoUrl: "",
                summary: "",
                isPublic: true,
            });
            setThumbnailFile(null);
            setDuration(null);
            setDurationError(null);
        } catch (err) {
            console.error(err);
            alert("컨텐츠 등록 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 text-white">
            <h1 className="text-2xl font-bold mb-6">컨텐츠 등록 (유튜브 길이 자동 감지)</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 제목 */}
                <div>
                    <label className="block text-sm mb-1">제목</label>
                    <input
                        className="w-full border border-zinc-700 rounded-md px-3 py-2 bg-black text-white"
                        value={form.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                    />
                </div>

                {/* 카테고리 코드 */}
                <div>
                    <label className="block text-sm mb-1">카테고리 코드</label>
                    <input
                        className="w-full border border-zinc-700 rounded-md px-3 py-2 bg-black text-white"
                        value={form.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                        placeholder="예: ONWORLD_T1, NOTICE 등"
                    />
                </div>

                {/* 시리즈명 (옵션) */}
                <div>
                    <label className="block text-sm mb-1">시리즈명 (선택)</label>
                    <input
                        className="w-full border border-zinc-700 rounded-md px-3 py-2 bg-black text-white"
                        value={form.seriesName}
                        onChange={(e) => handleChange("seriesName", e.target.value)}
                        placeholder="예: T1 at Worlds 중국 생존기"
                    />
                </div>

                {/* 썸네일 파일 */}
                <div>
                    <label className="block text-sm mb-1">썸네일 이미지</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="w-full text-sm text-zinc-300"
                    />
                    <div className="mt-1 text-xs text-zinc-500">
                        업로드하면 첫 번째 이미지가 썸네일로 사용됩니다.
                    </div>
                </div>

                {/* 유튜브 URL */}
                <div>
                    <label className="block text-sm mb-1">유튜브 URL</label>
                    <input
                        className="w-full border border-zinc-700 rounded-md px-3 py-2 bg-black text-white"
                        value={form.videoUrl}
                        onChange={(e) => handleChange("videoUrl", e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                    />

                    <div className="mt-2 text-sm text-zinc-400">
                        URL 입력 후 잠시 기다리면 영상 길이를 자동으로 가져옵니다.
                    </div>

                    {/* 길이 상태 표시 */}
                    <div className="mt-2 text-sm">
                        {durationLoading && (
                            <span className="text-zinc-300">
                                영상 길이 감지 중입니다...
                            </span>
                        )}
                        {duration && !durationLoading && (
                            <span className="text-green-400">
                                감지된 영상 길이: <strong>{duration}</strong>
                            </span>
                        )}
                        {durationError && (
                            <span className="text-red-400">{durationError}</span>
                        )}
                    </div>
                </div>

                {/* 요약 */}
                <div>
                    <label className="block text-sm mb-1">요약 (선택)</label>
                    <textarea
                        className="w-full border border-zinc-700 rounded-md px-3 py-2 bg-black text-white min-h-[80px]"
                        value={form.summary}
                        onChange={(e) => handleChange("summary", e.target.value)}
                        placeholder="영상에 대한 짧은 설명을 입력하세요."
                    />
                </div>

                {/* 공개 여부 */}
                <div className="flex items-center gap-2">
                    <input
                        id="isPublic"
                        type="checkbox"
                        checked={form.isPublic}
                        onChange={(e) => handleChange("isPublic", e.target.checked)}
                        className="w-4 h-4"
                    />
                    <label htmlFor="isPublic" className="text-sm">
                        공개 컨텐츠 (체크 해제 시 비공개)
                    </label>
                </div>

                {/* 등록 버튼 */}
                <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 font-semibold"
                >
                    컨텐츠 등록
                </button>
            </form>

            {/* 유튜브 플레이어 (화면에는 안 보이게 숨김) */}
            <div id="hidden-youtube-player" className="hidden" />
        </div>
    );
}
