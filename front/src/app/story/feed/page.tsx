"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

// =======================
// 타입
// =======================

type MembershipPayType =
    | "ONE_TIME"
    | "YEARLY"
    | "RECURRING"
    | "NO_MEMBERSHIP"
    | string;

type MemberRole =
    | "USER"
    | "BLACKLIST"
    | "ADMIN"
    | "ADMIN_CONTENT"
    | "T1"
    | "PLAYER_DORAN"
    | "PLAYER_ONER"
    | "PLAYER_FAKER"
    | "PLAYER_GUMAYUSI"
    | "PLAYER_KERIA"
    | string;

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number | string;
    resMessage: string | null;
    result: T;
}

interface MemberReadOneRes {
    memberEmail?: string;
    memberName?: string;
    memberRole?: MemberRole | null;
    membershipPayType: MembershipPayType;
    playerKey?: string | null;
}

interface StoryFeedRes {
    boardNo: number;
    writer: string;
    title: string;
    contentPreview: string;
    locked: boolean;
    likeCount: number;
    createdDate?: string | null;
}

interface SpringPage<T> {
    content: T[];
    last: boolean;
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

// =======================
// 유틸
// =======================

function cx(...arr: Array<string | false | null | undefined>) {
    return arr.filter(Boolean).join(" ");
}

function clampText(s: string, max = 120) {
    if (!s) return "";
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function formatTimeAgo(iso?: string | null) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "";

    const diff = Date.now() - t;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "방금 전";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    return `${day}일 전`;
}

// =======================
// 채널(선수) 목록
// =======================

interface PlayerItem {
    playerKey: string;
    displayName: string;
    kind?: "SPECIAL" | "PLAYER";
    verified?: boolean;
}

const PLAYERS: PlayerItem[] = [
    { playerKey: "T1", displayName: "T1", kind: "SPECIAL", verified: false },
    { playerKey: "doran", displayName: "Doran", kind: "PLAYER", verified: true },
    { playerKey: "oner", displayName: "Oner", kind: "PLAYER", verified: true },
    { playerKey: "faker", displayName: "Faker", kind: "PLAYER", verified: true },
    { playerKey: "gumayusi", displayName: "Gumayusi", kind: "PLAYER", verified: true },
    { playerKey: "keria", displayName: "Keria", kind: "PLAYER", verified: true },
];

// =======================
// 권한/내정보
// =======================

function isAdminRole(role?: string | null) {
    return role === "ADMIN" || role === "ADMIN_CONTENT" || role === "T1";
}

function isPlayerRole(role?: string | null) {
    return (
        role === "PLAYER_DORAN" ||
        role === "PLAYER_ONER" ||
        role === "PLAYER_FAKER" ||
        role === "PLAYER_GUMAYUSI" ||
        role === "PLAYER_KERIA"
    );
}

function roleToPlayerKey(role?: string | null): string | null {
    switch (role) {
        case "PLAYER_DORAN":
            return "doran";
        case "PLAYER_ONER":
            return "oner";
        case "PLAYER_FAKER":
            return "faker";
        case "PLAYER_GUMAYUSI":
            return "gumayusi";
        case "PLAYER_KERIA":
            return "keria";
        default:
            return null;
    }
}

function useMeAndAccessGate() {
    const [loading, setLoading] = useState(true);

    const [canViewProtected, setCanViewProtected] = useState(false);
    const [membershipName, setMembershipName] = useState<string | null>(null);
    const [isPrivileged, setIsPrivileged] = useState(false);

    const [me, setMe] = useState<MemberReadOneRes | null>(null);

    useEffect(() => {
        const run = async () => {
            const token =
                typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

            if (!token) {
                setLoading(false);
                setCanViewProtected(false);
                setIsPrivileged(false);
                setMembershipName(null);
                setMe(null);
                return;
            }

            setLoading(true);
            try {
                const res = await apiClient.get<ApiResult<MemberReadOneRes>>("/member/readOne");

                if (!res.data.isSuccess || !res.data.result) {
                    setCanViewProtected(false);
                    setIsPrivileged(false);
                    setMembershipName(null);
                    setMe(null);
                    return;
                }

                const body = res.data.result;
                setMe(body);

                const role = (body.memberRole ?? "").toString();

                const privileged = isAdminRole(role) || isPlayerRole(role);
                const payType = (body.membershipPayType ?? "NO_MEMBERSHIP").toString();
                const memberActive = payType !== "NO_MEMBERSHIP";

                setIsPrivileged(privileged);
                setMembershipName(memberActive ? payType : null);

                setCanViewProtected(privileged || memberActive);
            } catch {
                setCanViewProtected(false);
                setIsPrivileged(false);
                setMembershipName(null);
                setMe(null);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    return { loading, canViewProtected, isPrivileged, membershipName, me };
}

// =======================
// API
// =======================

async function fetchFeed(writer: string, page: number, size: number) {
    const qs = new URLSearchParams();
    if (writer) qs.set("writer", writer);
    qs.set("page", String(page));
    qs.set("size", String(size));

    const res = await apiClient.get<ApiResult<SpringPage<StoryFeedRes>>>(
        `/boards/story/feed?${qs.toString()}`
    );

    if (!res.data.isSuccess || !res.data.result) {
        return { items: [] as StoryFeedRes[], hasMore: false };
    }

    const body = res.data.result;
    return {
        items: body.content ?? [],
        hasMore: !body.last,
    };
}

// =======================
// UI
// =======================

function VerifiedBadge() {
    return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-black">
      ✓
    </span>
    );
}

function StoryCard({
                       item,
                       canViewProtected,
                   }: {
    item: StoryFeedRes;
    canViewProtected: boolean;
}) {
    const locked = item.locked && !canViewProtected;

    return (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-white/90">{item.writer}</div>
                        <div className="text-xs text-white/50">{formatTimeAgo(item.createdDate)}</div>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-white/90">
                        {locked ? (
                            item.title
                        ) : (
                            <Link href={`/story/${item.boardNo}`} className="hover:underline">
                                {item.title}
                            </Link>
                        )}
                    </div>

                    <div className="mt-2 text-sm text-white/60">
                        {clampText(item.contentPreview ?? "", 140)}
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                        ❤️ {Number(item.likeCount ?? 0).toLocaleString()}
                    </div>

                    {locked ? (
                        <div className="mt-4">
                            <Link
                                href="/membership/all"
                                className="inline-flex items-center justify-center rounded-full bg-white text-black px-5 py-2 text-xs font-bold hover:bg-white/90"
                            >
                                멤버십 가입하러 가기
                            </Link>
                        </div>
                    ) : null}
                </div>

                <button type="button" className="rounded-full px-2 py-1 text-white/40 hover:text-white/70">
                    ⋮
                </button>
            </div>
        </div>
    );
}

// =======================
// 메인
// =======================

export default function StoryFeedPage() {
    const router = useRouter();
    const sp = useSearchParams();

    const { loading: gateLoading, canViewProtected, isPrivileged, membershipName, me } =
        useMeAndAccessGate();

    const playerFromQuery = (sp.get("player") ?? "").trim();

    const selectedWriter = useMemo(() => {
        const fallback = PLAYERS[0]?.playerKey ?? "T1";
        return playerFromQuery || fallback;
    }, [playerFromQuery]);

    const selectedPlayerInfo = PLAYERS.find((p) => p.playerKey === selectedWriter) ?? null;

    const [feed, setFeed] = useState<StoryFeedRes[]>([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // ✅ “이 채널에서 글쓰기 가능?” 판단
    // ✅ 글쓰기 불가 이유(있으면 비활성) / 없으면(null) 작성 가능
    const writeDisabledReason = useMemo(() => {
        if (!me) return "로그인이 필요합니다.";
        const role = (me.memberRole ?? "").toString();

        // 관리자/공식 T1은 T1 채널에서만
        if (isAdminRole(role) && selectedWriter !== "T1") {
            return "관리자는 T1 채널에서만 작성 가능합니다.";
        }

        // 선수는 본인 채널에서만
        if (isPlayerRole(role)) {
            const myKey = roleToPlayerKey(role) || (me.playerKey ?? null);
            if (!myKey) return "선수 계정에 playerKey가 없습니다.";
            if (selectedWriter.toLowerCase() !== myKey.toLowerCase()) {
                return "본인 채널에서만 작성 가능합니다.";
            }
        }

        // 일반 유저는 작성 불가
        if (!isAdminRole(role) && !isPlayerRole(role)) {
            return "작성 권한이 없습니다.";
        }

        return null; // ✅ 작성 가능
    }, [me, selectedWriter]);

    const canWriteHere = !writeDisabledReason;


    useEffect(() => {
        let alive = true;

        (async () => {
            setFeedLoading(true);
            setFeedError(null);
            setPage(0);

            try {
                const r = await fetchFeed(selectedWriter, 0, 10);
                if (!alive) return;

                setFeed(r.items);
                setHasMore(r.hasMore);
            } catch {
                if (!alive) return;
                setFeed([]);
                setHasMore(false);
                setFeedError("피드를 불러오지 못했습니다.");
            } finally {
                if (!alive) return;
                setFeedLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedWriter]);

    const onLoadMore = async () => {
        if (!hasMore || feedLoading) return;

        const next = page + 1;
        setFeedLoading(true);

        try {
            const r = await fetchFeed(selectedWriter, next, 10);
            setFeed((prev) => [...prev, ...r.items]);
            setHasMore(r.hasMore);
            setPage(next);
        } catch {
            setFeedError("추가 로딩에 실패했습니다.");
        } finally {
            setFeedLoading(false);
        }
    };

    const onSelectPlayer = (key: string) => {
        const params = new URLSearchParams(sp.toString());
        params.set("player", key);
        router.push(`/story/feed?${params.toString()}`);
    };

    // ✅ 모달 대신 “페이지로 이동”
    const goWritePage = () => {
        const params = new URLSearchParams();
        params.set("player", selectedWriter);
        router.push(`/story/write?${params.toString()}`);
    };

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-6xl px-4 py-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                        <div className="text-xl font-bold">Story</div>
                        <div className="mt-1 text-xs text-white/50">
                            {gateLoading ? (
                                "접근 권한 확인 중…"
                            ) : canViewProtected ? (
                                isPrivileged ? (
                                    "특권 계정으로 열람 중입니다."
                                ) : membershipName ? (
                                    `${membershipName} 멤버십으로 열람 중입니다.`
                                ) : (
                                    "멤버십으로 열람 중입니다."
                                )
                            ) : (
                                "일부 콘텐츠는 멤버십 전용입니다."
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedPlayerInfo ? (
                            <div className="text-xs text-white/40">
                                현재:{" "}
                                <span className="text-white/80 font-semibold">
                  {selectedPlayerInfo.displayName}
                </span>
                            </div>
                        ) : null}

                        {/* ✅ 글쓰기 버튼: 이제 페이지로 이동 */}
                        <button
                            type="button"
                            onClick={goWritePage}
                            disabled={!canWriteHere}
                            title={writeDisabledReason ?? "스토리 작성"}
                            className={cx(
                                "rounded-full px-5 py-2 text-xs font-bold",
                                canWriteHere
                                    ? "bg-white text-black hover:bg-white/90"
                                    : "bg-white/20 text-white/40 cursor-not-allowed"
                            )}
                        >
                            글쓰기
                        </button>
                        {/* ✅ 버튼 옆에 비활성 이유 표시 */}
                        {writeDisabledReason ? (
                            <div className="text-xs text-white/40">{writeDisabledReason}</div>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
                    {/* 왼쪽 채널 */}
                    <aside className="md:sticky md:top-20 h-fit rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10">
                            <div className="text-sm font-semibold text-white/90">Channels</div>
                            <div className="mt-1 text-[11px] text-white/50">선수/채널을 선택하세요.</div>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto px-2 py-3">
                            {PLAYERS.map((p) => {
                                const active = p.playerKey === selectedWriter;

                                return (
                                    <button
                                        key={p.playerKey}
                                        type="button"
                                        onClick={() => onSelectPlayer(p.playerKey)}
                                        className={cx(
                                            "w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors",
                                            active ? "bg-white/10" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div
                                            className={cx(
                                                "relative h-11 w-11 overflow-hidden rounded-full bg-white/10 flex items-center justify-center",
                                                active && "ring-2 ring-red-500/70"
                                            )}
                                        >
                      <span className="text-xs text-white/70">
                        {p.displayName.slice(0, 2).toUpperCase()}
                      </span>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="truncate text-sm font-semibold text-white/90">
                                                    {p.displayName}
                                                </div>
                                                {p.verified ? <VerifiedBadge /> : null}
                                            </div>
                                            <div className="mt-1 text-[11px] text-white/45">
                                                {p.kind === "SPECIAL" ? "Official" : "Player"}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* 오른쪽 피드 */}
                    <section className="space-y-5">
                        {feedLoading && feed.length === 0 ? (
                            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-white/60 text-sm">
                                불러오는 중…
                            </div>
                        ) : feedError ? (
                            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-red-300">
                                {feedError}
                            </div>
                        ) : feed.length === 0 ? (
                            <div className="rounded-3xl bg-white/5 border border-white/10 p-10 text-center">
                                <div className="text-xl">🕳️</div>
                                <div className="mt-3 text-sm font-semibold text-white/90">
                                    표시할 스토리가 없습니다.
                                </div>
                                <div className="mt-2 text-xs text-white/50">
                                    다른 채널을 선택해보세요.
                                </div>
                            </div>
                        ) : (
                            <>
                                {feed.map((item) => (
                                    <StoryCard key={item.boardNo} item={item} canViewProtected={canViewProtected} />
                                ))}

                                <div className="flex justify-center pt-2">
                                    {hasMore ? (
                                        <button
                                            type="button"
                                            onClick={onLoadMore}
                                            className="rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-6 py-2 text-xs font-semibold text-white/90"
                                        >
                                            {feedLoading ? "불러오는 중…" : "더 보기"}
                                        </button>
                                    ) : (
                                        <div className="text-xs text-white/35 py-4">끝입니다.</div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}
