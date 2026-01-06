// src/app/community/[category]/write/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

type RouteCategory = "about" | "lounge" | "to-t1";
type BoardType = "COMMUNITY";
type CommunityCategoryCode = "ABOUT" | "LOUNGE" | "TO_T1";

interface MemberReadOneRes {
    memberEmail: string;
    memberRole: string;
    membershipPayType?: string;
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number | string;
    resMessage: string | null;
    result: T;
    message?: string;
}

interface CreateBoardRes {
    boardNo: number;
}

function isPlayerRole(role?: string) {
    return !!role && role.startsWith("PLAYER");
}
function isAdminRole(role?: string) {
    return role === "ADMIN" || role === "MANAGER";
}
function isMembershipActive(m: MemberReadOneRes | null) {
    return !!m && (m.membershipPayType ?? "NO_MEMBERSHIP") !== "NO_MEMBERSHIP";
}

// ✅ 핵심: 멤버십 권한(멤버십 OR 선수 OR 관리자)
function hasMembershipPrivilege(m: MemberReadOneRes | null) {
    if (!m) return false;
    if (isAdminRole(m.memberRole)) return true;
    if (isPlayerRole(m.memberRole)) return true; // 🔥 선수 특권
    return isMembershipActive(m);
}

function meta(route: RouteCategory) {
    const map: Record<
        RouteCategory,
        {
            title: string;
            badgeLabel: string;
            badgeTone: "blue" | "purple" | "orange";
            boardType: BoardType;
            categoryCode: CommunityCategoryCode;
        }
    > = {
        about: {
            title: "About T1",
            badgeLabel: "About T1",
            badgeTone: "blue",
            boardType: "COMMUNITY",
            categoryCode: "ABOUT",
        },
        lounge: {
            title: "T1 Lounge",
            badgeLabel: "T1 Lounge",
            badgeTone: "purple",
            boardType: "COMMUNITY",
            categoryCode: "LOUNGE",
        },
        "to-t1": {
            title: "To. T1",
            badgeLabel: "To. T1",
            badgeTone: "orange",
            boardType: "COMMUNITY",
            categoryCode: "TO_T1",
        },
    };
    return map[route];
}

function canWrite(route: RouteCategory, me: MemberReadOneRes | null) {
    const admin = isAdminRole(me?.memberRole);
    if (admin) return { ok: true, reason: "" };

    // ✅ 선수도 멤버십 권한 처리
    const privileged = hasMembershipPrivilege(me);
    if (!privileged) return { ok: false, reason: "멤버십 회원에게 공개된 페이지예요." };

    // ✅ Lounge는 선수 차단 유지(형님 기존 정책)
    if (route === "lounge" && isPlayerRole(me?.memberRole)) {
        return { ok: false, reason: "스타에게 노출되지 않는 비공개 보드에요." };
    }

    return { ok: true, reason: "" };
}

function badgeClass(tone: "blue" | "purple" | "orange") {
    switch (tone) {
        case "blue":
            return "bg-sky-500/15 text-sky-200 ring-sky-400/30";
        case "purple":
            return "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/30";
        case "orange":
            return "bg-orange-500/15 text-orange-200 ring-orange-400/30";
        default:
            return "bg-white/10 text-white/80 ring-white/10";
    }
}

type PreviewItem = {
    file: File;
    url: string;
};

export default function CommunityWritePage() {
    const router = useRouter();
    const params = useParams();
    const raw = (params?.category as string | undefined) ?? "about";

    const route: RouteCategory =
        raw === "about" || raw === "lounge" || raw === "to-t1" ? raw : "about";

    const m = useMemo(() => meta(route), [route]);

    const [me, setMe] = useState<MemberReadOneRes | null>(null);
    const [loadingMe, setLoadingMe] = useState(true);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<PreviewItem[]>([]);

    const [submitting, setSubmitting] = useState(false);

    const access = useMemo(() => canWrite(route, me), [route, me]);

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
        for (const p of previews) {
            try {
                URL.revokeObjectURL(p.url);
            } catch {}
        }

        const next = files
            .filter((f) => f.type?.startsWith("image/"))
            .map((f) => ({
                file: f,
                url: URL.createObjectURL(f),
            }));

        setPreviews(next);

        return () => {
            for (const p of next) {
                try {
                    URL.revokeObjectURL(p.url);
                } catch {}
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files;
        if (!list) return;

        const arr = Array.from(list);
        setFiles(arr);
        e.target.value = "";
    };

    const removeFileAt = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const clearFiles = () => {
        setFiles([]);
    };

    const onSubmit = async () => {
        if (submitting) return;

        if (!access.ok) {
            alert(access.reason || "권한이 없습니다.");
            return;
        }
        if (!title.trim()) {
            alert("제목은 필수입니다.");
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();

            fd.append("boardTitle", title.trim());
            fd.append("boardContent", content ?? "");
            fd.append("boardType", m.boardType);
            fd.append("categoryCode", m.categoryCode);

            fd.append("notice", "false");
            fd.append("isSecret", "false");

            for (const f of files) fd.append("images", f);

            const res = await apiClient.post<ApiResult<CreateBoardRes>>("/board", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const boardNo = res.data?.result?.boardNo;
            if (!boardNo) {
                alert("등록은 완료되었으나 게시글 번호를 확인할 수 없습니다.");
                router.replace(`/community/${route}`);
                return;
            }

            router.replace(`/community/${route}/${boardNo}`);
        } catch (err: any) {
            const msg =
                err?.response?.data?.resMessage ||
                err?.response?.data?.message ||
                err?.message ||
                "서버 오류가 발생했습니다.";
            console.error("CREATE ERROR", err?.response?.data || err);
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingMe) return <div className="text-white/70">불러오는 중...</div>;

    if (!access.ok) {
        return (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-4">
                <div className="text-4xl">🔒</div>
                <div className="text-white/80">{access.reason}</div>

                <Link
                    href="/membership/all"
                    className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-500"
                >
                    멤버십 가입하기
                </Link>

                <Link
                    href={`/community/${route}`}
                    className="rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                    목록으로
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="border-b border-white/10 pb-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-white">글 작성하기</div>
                        <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeClass(
                                m.badgeTone
                            )}`}
                            title={m.title}
                        >
                            {m.badgeLabel}
                        </span>
                    </div>

                    <Link
                        href={`/community/${route}`}
                        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                        목록
                    </Link>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-white/80">제목</span>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="rounded-2xl bg-black/25 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/20"
                        placeholder="제목을 입력해주세요."
                    />
                </label>

                <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-white/80">내용</span>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="rounded-2xl bg-black/25 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/20"
                        placeholder="내용을 입력해주세요."
                    />
                </label>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white/80">이미지 (선택)</span>

                        {files.length > 0 && (
                            <button
                                type="button"
                                onClick={clearFiles}
                                className="text-xs font-semibold text-white/50 hover:text-white/70"
                            >
                                전체 제거
                            </button>
                        )}
                    </div>

                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={onPickFiles}
                        className="text-white/70"
                    />

                    {files.length > 0 && (
                        <div className="text-xs text-white/50">선택됨: {files.length}개</div>
                    )}

                    {previews.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {previews.map((p, idx) => (
                                <div
                                    key={`${p.file.name}-${p.file.size}-${idx}`}
                                    className="group relative overflow-hidden rounded-2xl bg-black/25 ring-1 ring-white/10"
                                >
                                    <img src={p.url} alt={p.file.name} className="h-32 w-full object-cover" />

                                    <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-1">
                                        <div className="truncate text-[11px] text-white/80">
                                            {p.file.name}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeFileAt(idx)}
                                        className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white/80 ring-1 ring-white/10 opacity-0 transition group-hover:opacity-100 hover:bg-black/75"
                                        title="이 이미지 제거"
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                >
                    {submitting ? "등록 중..." : "등록"}
                </button>

                <Link
                    href={`/community/${route}`}
                    className="rounded-xl bg-black/25 px-6 py-3 text-sm font-semibold text-white hover:bg-black/35"
                >
                    취소
                </Link>
            </div>
        </div>
    );
}
