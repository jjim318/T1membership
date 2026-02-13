"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

type RouteCategory = "about" | "lounge" | "to-t1";

// ✅ 백엔드 enum과 100% 일치
type BoardType = "COMMUNITY";

// ✅ categoryCode 컬럼 재사용 (COMMUNITY일 때만 의미가 이거)
type CommunityCategoryCode = "ABOUT" | "LOUNGE" | "TO_T1";

interface MemberReadOneRes {
    memberEmail: string;
    memberRole: string; // "USER" | "ADMIN" | "PLAYER_..." ...
    membershipPayType?: string; // "NO_MEMBERSHIP" | "ONE_TIME" | "YEARLY" | "RECURRING"
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number | string;
    resMessage: string | null;
    result: T;
    message?: string;
    path?: string;
    timestamp?: string;
}

// ✅ 목록 응답(백엔드 ReadAllBoardRes 기준)
interface BoardSummary {
    boardNo: number;
    boardTitle: string;
    boardWriter: string;

    // 목록에서 작성자 판별하려면 이메일이 필요합니다.
    // ✅ 백엔드에 있으면 내려오게 하는 게 베스트인데,
    // 형님이 이미 상세에서는 boardWriterEmail을 쓰고 있으니 목록도 가능하면 추가 추천.
    boardWriterEmail?: string | null;

    createDate?: string;
    latestDate?: string;
}

function isPlayerRole(role?: string) {
    return !!role && role.startsWith("PLAYER");
}
function isAdminRole(role?: string) {
    return role === "ADMIN" || role === "MANAGER";
}
function isMembershipActive(m: MemberReadOneRes | null) {
    if (!m) return false;
    return (m.membershipPayType ?? "NO_MEMBERSHIP") !== "NO_MEMBERSHIP";
}

// ✅ 핵심: 멤버십 권한(멤버십 OR 선수 OR 관리자)
function hasMembershipPrivilege(m: MemberReadOneRes | null) {
    if (!m) return false;
    if (isAdminRole(m.memberRole)) return true;
    if (isPlayerRole(m.memberRole)) return true; // 🔥 선수 특권
    return isMembershipActive(m);
}

function categoryMeta(route: RouteCategory) {
    const map: Record<
        RouteCategory,
        {
            title: string;
            boardType: BoardType;
            categoryCode: CommunityCategoryCode;
            hint: string;
            privateNotice?: string;
        }
    > = {
        about: {
            title: "About T1",
            boardType: "COMMUNITY",
            categoryCode: "ABOUT",
            hint: "멤버십 회원들끼리 이야기하는 커뮤니티에요.",
        },
        lounge: {
            title: "T1 Lounge",
            boardType: "COMMUNITY",
            categoryCode: "LOUNGE",
            hint: "멤버십 회원들만 이용 가능한 공간이에요.",
            privateNotice: "스타에게 노출되지 않는 비공개 보드에요.",
        },
        "to-t1": {
            title: "To. T1",
            boardType: "COMMUNITY",
            categoryCode: "TO_T1",
            hint: "멤버십 회원이 작성하고, 매니저(관리자) / 본인만 열람하는 공간이에요.",
            privateNotice: "매니저만 열람할 수 있는 비공개 보드에요.",
        },
    };
    return map[route];
}

/**
 * ✅ 변경된 TO_T1 정책(형님 요구사항)
 * - 목록은 "전체 글"을 다 띄운다 (관리자/유저/선수 모두)
 * - 하지만 "관리자"가 아니고 "내 글"도 아니면:
 *    - 제목/작성자/날짜 대신 "비밀글입니다."만 보여준다
 *    - 클릭도 안되게 막는다
 *
 * 즉, TO_T1에서 mineOnly는 더 이상 쓰지 않는다.
 */
function getAccess(route: RouteCategory, me: MemberReadOneRes | null) {
    const role = me?.memberRole;
    const admin = isAdminRole(role);
    const player = isPlayerRole(role);

    // 관리자: 다 가능
    if (admin) {
        return { canReadList: true, canWrite: true, reason: "" };
    }

    // ✅ 멤버십 권한(멤버십 OR 선수)
    const privileged = hasMembershipPrivilege(me);

    // 권한 없으면 차단
    if (!privileged) {
        return {
            canReadList: false,
            canWrite: false,
            reason: "멤버십 회원에게 공개된 페이지예요.",
        };
    }

    // Lounge는 선수 차단 유지
    if (route === "lounge") {
        if (player) {
            return {
                canReadList: false,
                canWrite: false,
                reason: "스타에게 노출되지 않는 비공개 보드에요.",
            };
        }
        return { canReadList: true, canWrite: true, reason: "" };
    }

    // to-t1: 목록은 전체 허용(단, 마스킹은 렌더링에서 처리)
    if (route === "to-t1") {
        return { canReadList: true, canWrite: true, reason: "" };
    }

    // about
    return { canReadList: true, canWrite: true, reason: "" };
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

// ✅ 서버 LocalDateTime → JS Date 안전 변환
function parseServerDate(raw?: string | null): Date | null {
    if (!raw) return null;

    let s = raw.trim();
    if (!s) return null;

    // 마이크로초(6자리) → 밀리초(3자리)
    s = s.replace(/(\.\d{3})\d+/, "$1");

    // 타임존 없으면 KST 보정
    if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
        s += "+09:00";
    }

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

export default function CommunityCategoryPage() {
    const params = useParams();
    const raw = (params?.category as string | undefined) ?? "about";

    const route: RouteCategory =
        raw === "about" || raw === "lounge" || raw === "to-t1" ? raw : "about";

    const meta = useMemo(() => categoryMeta(route), [route]);

    const [me, setMe] = useState<MemberReadOneRes | null>(null);
    const [loadingMe, setLoadingMe] = useState(true);

    const [posts, setPosts] = useState<BoardSummary[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    const access = useMemo(() => getAccess(route, me), [route, me]);

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
        if (loadingMe) return;

        if (!access.canReadList) {
            setPosts([]);
            setLoadingPosts(false);
            return;
        }

        const run = async () => {
            setLoadingPosts(true);
            try {
                // ✅ TO_T1도 이제 mineOnly로 자르지 않고 전체 목록 요청
                const qs = new URLSearchParams({
                    boardType: meta.boardType,
                    categoryCode: meta.categoryCode,
                    mineOnly: "false",
                });

                const res = await apiClient.get<ApiResult<any>>(`/board?${qs.toString()}`);
                const r = res.data.result as any;

                const list: BoardSummary[] =
                    Array.isArray(r) ? r
                        : Array.isArray(r?.dtoList) ? r.dtoList
                            : Array.isArray(r?.content) ? r.content
                                : [];

                setPosts(list);
            } catch (e) {
                console.error("LIST ERROR", e);
                setPosts([]);
            } finally {
                setLoadingPosts(false);
            }
        };

        run();
    }, [loadingMe, meta.boardType, meta.categoryCode, access.canReadList]);

    if (loadingMe) return <div className="text-white/70">불러오는 중...</div>;

    const shouldShowTopNotice = !!meta.privateNotice;

    if (!access.canReadList) {
        return (
            <div className="flex flex-col">
                {shouldShowTopNotice && meta.privateNotice && (
                    <TopPrivateNoticeBar text={meta.privateNotice} />
                )}

                <div className="flex min-h-[520px] flex-col items-center justify-center gap-4">
                    <div className="text-4xl">🔒</div>
                    <div className="text-white/80">{access.reason}</div>

                    <Link
                        href="/membership/all"
                        className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-500"
                    >
                        멤버십 가입하기
                    </Link>
                </div>
            </div>
        );
    }

    const myEmailLower = (me?.memberEmail ?? "").toLowerCase();
    const isAdmin = isAdminRole(me?.memberRole);

    return (
        <div className="flex flex-col gap-4">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <div className="text-lg font-bold text-white">{meta.title}</div>
                    <div className="mt-1 text-sm text-white/50">{meta.hint}</div>
                </div>

                {access.canWrite && (
                    <Link
                        href={`/community/${route}/write`}
                        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                        글쓰기
                    </Link>
                )}
            </div>

            {shouldShowTopNotice && meta.privateNotice && (
                <TopPrivateNoticeBar text={meta.privateNotice} />
            )}

            {/* 목록 */}
            {loadingPosts ? (
                <div className="text-white/60">게시글 불러오는 중...</div>
            ) : posts.length === 0 ? (
                <div className="rounded-2xl bg-black/20 p-6 text-white/60">아직 글이 없습니다.</div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {posts.map((p) => {
                        // ✅ TO_T1에서만: 내 글/관리자만 정상 노출, 그 외는 마스킹 + 클릭 금지
                        const writerEmailLower = (p.boardWriterEmail ?? "").toLowerCase();
                        const isOwner =
                            !!myEmailLower &&
                            !!writerEmailLower &&
                            myEmailLower === writerEmailLower;

                        const shouldMask = route === "to-t1" && !isAdmin && !isOwner;

                        if (shouldMask) {
                            // 🔥 클릭 불가 + "비밀글입니다."
                            return (
                                <li key={p.boardNo}>
                                    <div
                                        className="block cursor-not-allowed rounded-2xl bg-black/20 p-4 opacity-80"
                                        title="비밀글은 열람할 수 없습니다."
                                    >
                                        <div className="text-white/70 font-semibold">비밀글입니다.</div>
                                    </div>
                                </li>
                            );
                        }

                        // ✅ 정상 노출(관리자 or 내 글 or TO_T1 아닌 경우)
                        return (
                            <li key={p.boardNo}>
                                <Link
                                    href={`/community/${route}/${p.boardNo}`}
                                    className="block rounded-2xl bg-black/20 p-4 hover:bg-black/30"
                                >
                                    <div className="text-white font-semibold">{p.boardTitle}</div>
                                    <div className="mt-1 text-xs text-white/50">
                                        {p.boardWriter} · {formatDateTime(p.createDate ?? p.latestDate)}
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}