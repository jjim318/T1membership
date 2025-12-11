// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

// =======================
// 공통 상수 / 유틸
// =======================

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * 백엔드에서 내려주는 thumbnailUrl 값이
 * 1) 유튜브 링크일 때 → 썸네일 이미지 URL로 변환
 * 2) /files/ 로 시작하면 → API_BASE 붙여서 절대 URL로 변환
 * 3) 그 외 절대 URL이면 → 그대로 사용
 */
function resolveThumbnailUrl(raw?: string | null): string | null {
  if (!raw) return null;

  const url = raw.trim();

  // 1) 유튜브 링크면 → img.youtube.com 썸네일로 치환
  if (url.includes("youtu.be") || url.includes("youtube.com")) {
    try {
      let videoId = "";

      if (url.includes("youtu.be")) {
        const u = new URL(url);
        videoId = u.pathname.split("/").filter(Boolean).pop() ?? "";
      } else {
        const u = new URL(url);
        videoId = u.searchParams.get("v") ?? "";
      }

      if (!videoId) return null;

      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } catch {
      return null;
    }
  }

  // 2) /files 로 시작하면 백엔드 주소 붙이기
  if (url.startsWith("/files")) {
    return `${API_BASE}${url}`;
  }

  // 3) 이미 절대 URL(https://...)이면 그대로
  return url;
}

// =======================
// 타입 정의 (백엔드 DTO에 맞춤)
// =======================

// /main 응답
interface MainSectionItem {
  boardId: number;
  title: string;
  thumbnailUrl: string | null;
  category: "STORY" | "CONTENT" | string;
}

interface MainPageRes {
  storyItems: MainSectionItem[];
  contentItems: MainSectionItem[];
}

interface ApiResult<T> {
  isSuccess: boolean;
  resCode: number;
  resMessage: string;
  result: T;
}

// /member/readOne 응답
type MembershipPayType =
    | "ONE_TIME"
    | "YEARLY"
    | "RECURRING"
    | "NO_MEMBERSHIP"
    | string;

interface MemberReadOneRes {
  memberEmail: string;
  memberName: string;
  membershipPayType: MembershipPayType;
}

// JWT 페이로드
interface JwtPayload {
  sub?: string;
  roles?: string[]; // ["USER","ADMIN"]
  memberRole?: string; // "ADMIN", "ADMIN_CONTENT" 등
  [key: string]: unknown;
}

// =======================
// JWT 유틸
// =======================

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

// =======================
// 멤버십 / 관리자 상태 체크
// =======================

type MembershipState = "UNKNOWN" | "NONE" | "ACTIVE";

interface MembershipStatusHook {
  isMember: boolean;
  isAdmin: boolean;
  canViewProtected: boolean;
  loading: boolean;
  membershipName?: string;
}

function useMembershipStatus(): MembershipStatusHook {
  const [state, setState] = useState<MembershipState>("UNKNOWN");
  const [loading, setLoading] = useState(true);
  const [membershipName, setMembershipName] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("accessToken");
      if (!token) {
        setState("NONE");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1) 토큰에서 관리자 여부 판별
      const payload = parseJwt(token);
      if (payload) {
        const roles = payload.roles ?? [];
        const memberRole = (payload.memberRole ?? "") as string;

        const adminLike =
            roles.includes("ADMIN") ||
            roles.includes("ADMIN_CONTENT") ||
            memberRole === "ADMIN" ||
            memberRole === "ADMIN_CONTENT";

        if (adminLike) {
          setIsAdmin(true);
        }
      }

      try {
        // 2) /member/readOne 으로 멤버십 타입 확인
        const res =
            await apiClient.get<ApiResult<MemberReadOneRes>>(
                "/member/readOne",
            );

        if (!res.data.isSuccess || !res.data.result) {
          setState("NONE");
          return;
        }

        const body = res.data.result;

        const active =
            body.membershipPayType &&
            body.membershipPayType !== "NO_MEMBERSHIP";

        if (active) {
          setState("ACTIVE");
          setMembershipName(body.membershipPayType);
        } else {
          setState("NONE");
        }
      } catch (e) {
        console.error("[Membership] status check error", e);
        setState("NONE");
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  const isMember = state === "ACTIVE";
  const canViewProtected = isMember || isAdmin; // 🔥 관리자면 멤버십 없어도 통과

  return {
    isMember,
    isAdmin,
    canViewProtected,
    loading,
    membershipName,
  };
}

// =======================
// 메인 페이지 데이터 (/main)
// =======================

function useMainPage(enabled: boolean) {
  const [data, setData] = useState<MainPageRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchMain = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res =
            await apiClient.get<ApiResult<MainPageRes>>("/main");

        if (!res.data.isSuccess || !res.data.result) {
          setErrorMsg(res.data.resMessage || "메인 데이터 로딩 실패");
          setData(null);
          return;
        }

        setData(res.data.result);
      } catch (e) {
        console.error("[Main] load error", e);
        setErrorMsg("메인 데이터 통신 오류");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMain();
  }, [enabled]);

  return { data, loading, errorMsg };
}

// =======================
// 공통 락 섹션
// =======================

function LockedSection({ message }: { message: string }) {
  return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl bg-[#111111] border border-white/10 px-4 py-8 text-center">
        <div className="mb-3 text-2xl">🔒</div>
        <p className="text-sm font-semibold mb-2">멤버십 회원 전용 콘텐츠입니다.</p>
        <p className="text-xs text-gray-400 mb-4">{message}</p>
        <Link
            href="/membership/all"
            className="rounded-full bg-white px-6 py-2 text-xs font-semibold text-black hover:bg-gray-100"
        >
          멤버십 가입하러 가기
        </Link>
      </div>
  );
}

// =======================
// STORY 섹션 (storyItems 사용)
// =======================

function StorySlider({ items }: { items: MainSectionItem[] }) {
  if (!items || items.length === 0) {
    return (
        <div className="rounded-3xl bg-[#111111] px-4 py-8 text-center text-sm text-gray-400">
          표시할 스토리 게시글이 없습니다.
        </div>
    );
  }

  return (
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          {items.map(item => {
            const thumb = resolveThumbnailUrl(item.thumbnailUrl);

            return (
                <Link
                    key={item.boardId}
                    href={`/story/${item.boardId}`} // 실제 라우트에 맞게 조정
                    className="min-w-[200px] max-w-[220px] rounded-2xl bg-gradient-to-br from-[#ff5b3b] to-[#ff9745] p-[1px]"
                >
                  <div className="flex h-40 flex-col justify-between rounded-2xl bg-[#171717] p-3">
                    <div className="text-[11px] font-semibold text-white/90 flex items-center gap-1">
                      <span>멤버십 회원 전용</span>
                      <span>🔒</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {thumb && (
                          <div className="h-16 w-full overflow-hidden rounded-xl bg-black">
                            <img
                                src={thumb}
                                alt={item.title}
                                className="h-full w-full object-cover"
                            />
                          </div>
                      )}
                      <span className="text-xs font-semibold line-clamp-2">
                    {item.title}
                  </span>
                    </div>
                  </div>
                </Link>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
          <div className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/70">
            <span className="text-xs">{">"}</span>
          </div>
        </div>
      </div>
  );
}

// =======================
// CONTENT 섹션 (contentItems 사용)
// =======================

function ContentGrid({ items }: { items: MainSectionItem[] }) {
  if (!items || items.length === 0) {
    return (
        <div className="rounded-3xl bg-[#111111] px-4 py-8 text-center text-sm text-gray-400">
          표시할 컨텐츠 게시글이 없습니다.
        </div>
    );
  }

  return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {items.map(item => {
          const thumb = resolveThumbnailUrl(item.thumbnailUrl);

          return (
              <Link
                  key={item.boardId}
                  href={`/content/${item.boardId}`}
                  className="flex flex-col overflow-hidden rounded-3xl bg-[#141414] hover:bg-[#181818] transition-colors"
              >
                {thumb && (
                    <div className="relative h-[200px] w-full overflow-hidden">
                      <img
                          src={thumb}
                          alt={item.title}
                          className="h-full w-full object-cover"
                      />

                      {/* T1 스타일 그라데이션 */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t
                                from-black/85 via-black/10 to-transparent" />
                    </div>
                )}

                <div className="p-4 md:p-5">
                  <div className="mb-2 text-[11px] text-gray-400">Content</div>
                  <h3 className="text-sm md:text-base font-semibold line-clamp-2">
                    {item.title}
                  </h3>
                </div>
              </Link>
          );
        })}
      </div>
  );
}


// =======================
// 메인 페이지 컴포넌트
// =======================

export default function MainPage() {
  const {
    isMember,
    isAdmin,
    canViewProtected,
    loading: membershipLoading,
    membershipName,
  } = useMembershipStatus();

  // STORY/CONTENT 게시글은 관리자 or 멤버십 회원만 불러옴
  const { data, loading: mainLoading, errorMsg } = useMainPage(
      canViewProtected,
  );

  return (
      <main className="min-h-screen bg-black text-white">
        {/* 히어로: T1 Membership (전체 공개) */}
        <section className="w-full bg-gradient-to-r from-[#ff3b3b] via-[#ff5b3b] to-[#ff8a3b] text-white">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">T1 Membership</h1>
                <p className="mt-2 text-sm md:text-base opacity-90">
                  ROOTED IN OUR LEGACY, RAISING TROPHIES TOGETHER.
                </p>
                {isMember && (
                    <p className="mt-1 text-xs text-white/90">
                      {membershipName
                          ? `${membershipName} 멤버십 가입을 환영합니다.`
                          : "멤버십 가입을 환영합니다."}
                    </p>
                )}
                {isAdmin && !isMember && (
                    <p className="mt-1 text-xs text-yellow-200/90">
                      관리자 계정으로 모든 콘텐츠에 접근 가능합니다.
                    </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                    href="https://www.instagram.com/t1lol"
                    target="_blank"
                    className="flex items-center gap-1 hover:opacity-80"
                >
                  <span>📷</span>
                  <span>Instagram</span>
                </Link>
                <Link
                    href="https://www.youtube.com/@SKTT1"
                    target="_blank"
                    className="flex items-center gap-1 hover:opacity-80"
                >
                  <span>▶</span>
                  <span>YouTube</span>
                </Link>
                <Link
                    href="https://x.com/T1LoL"
                    target="_blank"
                    className="flex items-center gap-1 hover:opacity-80"
                >
                  <span>✖</span>
                  <span>X</span>
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                    href="/membership/all"
                    className="rounded-full bg-white/90 px-6 py-2 text-sm font-semibold text-black hover:bg-white"
                >
                  멤버십
                </Link>
                <button
                    type="button"
                    className="rounded-full border border-white/80 px-6 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  알리기
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STORY 섹션 */}
        <section className="w-full bg-[#111111]">
          <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
            {membershipLoading ? (
                <LockedSection message="멤버십 상태 확인 중입니다." />
            ) : canViewProtected ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-semibold">
                      멤버십 전용 스토리
                    </h2>
                    <span className="text-xs text-gray-400">
                  Story 탭에서 작성한 최신 게시글이 표시됩니다.
                </span>
                  </div>

                  {mainLoading ? (
                      <div className="text-xs text-gray-400 px-2 py-4">
                        스토리 게시글을 불러오는 중입니다…
                      </div>
                  ) : errorMsg ? (
                      <div className="text-xs text-red-400 px-2 py-4">
                        {errorMsg}
                      </div>
                  ) : (
                      <StorySlider items={data?.storyItems ?? []} />
                  )}
                </>
            ) : (
                <LockedSection message="선수 스토리는 멤버십 회원에게만 공개됩니다." />
            )}
          </div>
        </section>

        {/* CONTENT 섹션 */}
        <section className="w-full bg:black bg-black">
          <div className="mx-auto max-w-6xl px-4 pb-12 md:pb-16">
            <h2 className="mb-4 text-lg md:text-xl font-semibold">
              T1 Content Feed
            </h2>

            {membershipLoading ? (
                <LockedSection message="멤버십 상태 확인 중입니다." />
            ) : canViewProtected ? (
                mainLoading ? (
                    <div className="text-xs text-gray-400 px-2 py-4">
                      컨텐츠 게시글을 불러오는 중입니다…
                    </div>
                ) : errorMsg ? (
                    <div className="text-xs text-red-400 px-2 py-4">
                      {errorMsg}
                    </div>
                ) : (
                    <ContentGrid items={data?.contentItems ?? []} />
                )
            ) : (
                <LockedSection message="컨텐츠 피드는 멤버십 회원만 볼 수 있습니다." />
            )}
          </div>
        </section>
      </main>
  );
}
