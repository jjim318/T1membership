// src/app/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

// =======================
// 타입 정의
// =======================

type MainSection = "CONTENT" | "NOTICE" | "STORY";
type FeedCardType = "VIDEO" | "NOTICE" | "POST";
type FeedOrigin = "YOUTUBE" | "BOARD" | "SYSTEM";

interface ReactionCounts {
  like?: number;
  heart?: number;
  fun?: number;
  surprise?: number;
}

interface MainFeedCard {
  id: number | null;
  section: MainSection;
  type: FeedCardType;
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  membershipOnly: boolean;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  reactionCounts?: ReactionCounts | null;
  linkUrl?: string | null;
  origin: FeedOrigin;
  originAccount?: string | null;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

interface ApiResult<T> {
  isSuccess: boolean;
  resCode: number;
  resMessage: string;
  result: T;
}

type MainFeedResultShape =
    | PageResponse<MainFeedCard>
    | MainFeedCard[]
    | { dtoList: MainFeedCard[]; last?: boolean; isLast?: boolean };

interface StoryCard {
  id: number;
  label: string;
  nickname: string;
  avatarUrl: string;
  locked: boolean;
  gradientFrom: string;
  gradientTo: string;
}

interface SnsImageCard {
  id: number;
  imageUrl: string;
  alt: string;
  linkUrl: string;
}

// 🔐 멤버십 상태 응답 (형님 백엔드에 맞게 필드명만 맞추면 됨)
interface MembershipStatusRes {
  membershipActive: boolean; // true면 멤버십 가입자
  membershipName?: string;
}

// =======================
// 프론트 전용 더미 데이터
// =======================

// public/story/*.jpg
const STORY_CARDS: StoryCard[] = [
  {
    id: 1,
    label: "멤버십 회원 전용",
    nickname: "Gumayusi",
    avatarUrl: "/story/gumausi.jpg",
    locked: true,
    gradientFrom: "#FF7A00",
    gradientTo: "#FF3D00",
  },
  {
    id: 2,
    label: "멤버십 회원 전용",
    nickname: "Keria",
    avatarUrl: "/story/keria.jpg",
    locked: true,
    gradientFrom: "#FF6CAB",
    gradientTo: "#FF3D00",
  },
  {
    id: 3,
    label: "멤버십 회원 전용",
    nickname: "Faker",
    avatarUrl: "/story/faker.jpg",
    locked: true,
    gradientFrom: "#FFB300",
    gradientTo: "#FF5C00",
  },
  {
    id: 4,
    label: "멤버십 회원 전용",
    nickname: "Oner",
    avatarUrl: "/story/oner.jpg",
    locked: true,
    gradientFrom: "#FF7A00",
    gradientTo: "#FF3D00",
  },
  {
    id: 5,
    label: "멤버십 회원 전용",
    nickname: "Doran",
    avatarUrl: "/story/doran.jpg",
    locked: true,
    gradientFrom: "#FF5C7A",
    gradientTo: "#FF3DF4",
  },
];

// public/twitter/*.PNG
const TWITTER_CARDS: SnsImageCard[] = [
  {
    id: 1,
    imageUrl: "/twitter/1.PNG",
    alt: "T1 트위터 카드 1",
    linkUrl: "https://x.com/T1LoL",
  },
  {
    id: 2,
    imageUrl: "/twitter/3.PNG",
    alt: "T1 트위터 카드 2",
    linkUrl: "https://x.com/T1LoL",
  },
  {
    id: 3,
    imageUrl: "/twitter/1.PNG",
    alt: "T1 트위터 카드 3",
    linkUrl: "https://x.com/T1LoL",
  },
];

// 인스타는 일단 story 이미지 재사용
const INSTAGRAM_CARDS: SnsImageCard[] = [
  {
    id: 1,
    imageUrl: "/story/faker.jpg",
    alt: "T1 인스타 카드 1",
    linkUrl: "https://www.instagram.com/t1lol",
  },
  {
    id: 2,
    imageUrl: "/story/gumausi.jpg",
    alt: "T1 인스타 카드 2",
    linkUrl: "https://www.instagram.com/t1lol",
  },
  {
    id: 3,
    imageUrl: "/story/keria.jpg",
    alt: "T1 인스타 카드 3",
    linkUrl: "https://www.instagram.com/t1lol",
  },
];

// =======================
// 멤버십 상태 체크 훅
// =======================

type MembershipState = "UNKNOWN" | "NONE" | "ACTIVE";

function useMembershipStatus() {
  const [state, setState] = useState<MembershipState>("UNKNOWN");
  const [loading, setLoading] = useState(true);
  const [membershipName, setMembershipName] = useState<string | undefined>(
      undefined,
  );

  useEffect(() => {
    const check = async () => {
      // 토큰 없으면 바로 비가입자로 간주
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("accessToken");
      if (!token) {
        setState("NONE");
        setLoading(false);
        return;
      }

      try {
        const res =
            await apiClient.get<ApiResult<MembershipStatusRes>>(
                "/membership/status",
            ); // 🔥 형님 백엔드에 맞게 엔드포인트만 맞추기

        if (!res.data.isSuccess) {
          setState("NONE");
          setLoading(false);
          return;
        }

        const body = res.data.result;
        if (body.membershipActive) {
          setState("ACTIVE");
          setMembershipName(body.membershipName);
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

  return {
    isMember: state === "ACTIVE",
    loading,
    membershipName,
  };
}

// =======================
// 메인 피드 훅 (유튜브 + 공지, 무한 스크롤)
// =======================

function useMainFeed(pageSize: number = 10, enabled: boolean = true) {
  const [items, setItems] = useState<MainFeedCard[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadNextPage = useCallback(async () => {
    if (!enabled) return; // 🔐 멤버십 아니면 아예 안 부른다
    if (loading || last) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.get<ApiResult<MainFeedResultShape>>(
          "/main/feed",
          {
            params: { page, size: pageSize },
          },
      );

      if (!res.data.isSuccess) {
        setErrorMsg(res.data.resMessage || "메인 피드 로딩 실패");
        setLast(true);
        return;
      }

      const result = res.data.result;

      if (!result) {
        setErrorMsg("메인 피드 응답이 비어 있습니다.");
        setLast(true);
        return;
      }

      let pageContent: MainFeedCard[] = [];
      let lastFlag = false;

      if (Array.isArray(result)) {
        pageContent = result;
        lastFlag = true;
      } else if ("content" in result && Array.isArray(result.content)) {
        pageContent = result.content;
        lastFlag = Boolean(result.last);
      } else if ("dtoList" in result && Array.isArray(result.dtoList)) {
        pageContent = result.dtoList;
        lastFlag = Boolean(
            (result as { isLast?: boolean; last?: boolean }).isLast ??
            result.last,
        );
      } else {
        console.error("[MainFeed] 예상치 못한 응답 구조", result);
        setErrorMsg("메인 피드 응답 형식이 예상과 다릅니다.");
        setLast(true);
        return;
      }

      setItems(prev => [...prev, ...pageContent]);

      // 결과 개수가 pageSize 보다 적으면 마지막으로 판단
      if (pageContent.length === 0 || pageContent.length < pageSize) {
        lastFlag = true;
      }

      setPage(prev => prev + 1);
      setLast(lastFlag);
    } catch (e) {
      console.error("[MainFeed] load error", e);
      setErrorMsg("메인 피드 통신 오류");
      setLast(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, last, pageSize]);

  return { items, loadNextPage, last, loading, errorMsg };
}

// =======================
// 유틸 / 그리드 렌더링
// =======================

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function MainFeedGrid({ items }: { items: MainFeedCard[] }) {
  return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {items.map((card, idx) => {
          const isBigLeft = idx === 0;
          const baseClass =
              "rounded-3xl bg-[#141414] overflow-hidden flex flex-col";

          if (card.type === "VIDEO" && card.origin === "YOUTUBE") {
            return (
                <a
                    key={`${card.id}-${idx}`}
                    href={card.linkUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`${baseClass} ${
                        isBigLeft ? "md:row-span-2" : ""
                    } hover:bg-[#181818] transition-colors`}
                >
                  {card.thumbnailUrl && (
                      <div className="relative w-full overflow-hidden">
                        <div className="aspect-video w-full bg-black">
                          <img
                              src={card.thumbnailUrl}
                              alt={card.title}
                              className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px]">
                          YouTube
                        </div>
                      </div>
                  )}

                  <div className="flex flex-1 flex-col px-4 py-3 md:px-5 md:py-4">
                    <p className="text-xs text-gray-400 mb-1">
                      {formatDate(card.createdAt)} · 조회{" "}
                      {card.viewCount.toLocaleString()}
                    </p>
                    <h3 className="text-sm md:text-base font-semibold line-clamp-2">
                      {card.title}
                    </h3>
                    {card.subtitle && (
                        <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                          {card.subtitle}
                        </p>
                    )}
                  </div>
                </a>
            );
          }

          return (
              <div
                  key={`${card.id}-${idx}`}
                  className={`${baseClass} hover:bg-[#181818] transition-colors`}
              >
                <div className="flex flex-1 flex-col px-4 py-3 md:px-5 md:py-4">
                  <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-300">
                  {card.type === "NOTICE" ? "Notice" : "Post"}
                </span>
                    <span className="text-[10px] text-gray-400">
                  {formatDate(card.createdAt)}
                </span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold line-clamp-2 mb-1">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                        {card.subtitle}
                      </p>
                  )}

                  {card.reactionCounts && (
                      <div className="mt-auto flex flex-wrap gap-3 pt-2 text-[11px] text-gray-300">
                        {card.reactionCounts.like !== undefined && (
                            <span>👍 {card.reactionCounts.like}</span>
                        )}
                        {card.reactionCounts.heart !== undefined && (
                            <span>💗 {card.reactionCounts.heart}</span>
                        )}
                        {card.reactionCounts.fun !== undefined && (
                            <span>😂 {card.reactionCounts.fun}</span>
                        )}
                        {card.reactionCounts.surprise !== undefined && (
                            <span>😮 {card.reactionCounts.surprise}</span>
                        )}
                      </div>
                  )}
                </div>
              </div>
          );
        })}
      </div>
  );
}

// 🔐 공통 락 섹션
function LockedSection({ message }: { message: string }) {
  return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl bg-[#111111] border border-white/10 px-4 py-8 text-center">
        <div className="mb-3 text-2xl">🔒</div>
        <p className="text-sm font-semibold mb-2">멤버십 회원 전용 콘텐츠입니다.</p>
        <p className="text-xs text-gray-400 mb-4">{message}</p>
        <Link
            href="/membership"
            className="rounded-full bg-white px-6 py-2 text-xs font-semibold text-black hover:bg-gray-100"
        >
          멤버십 가입하러 가기
        </Link>
      </div>
  );
}

// =======================
// 메인 페이지 컴포넌트
// =======================

export default function MainPage() {
  const { isMember, loading: membershipLoading, membershipName } =
      useMembershipStatus();
  const { items, loadNextPage, last, loading, errorMsg } = useMainFeed(
      10,
      isMember,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 멤버십 가입자일 때만 피드 로딩
  useEffect(() => {
    if (isMember) {
      loadNextPage();
    }
  }, [isMember, loadNextPage]);

  // 인피니트 스크롤도 멤버십일 때만
  useEffect(() => {
    if (!isMember) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
        entries => {
          const first = entries[0];
          if (first.isIntersecting) {
            loadNextPage();
          }
        },
        { rootMargin: "200px" },
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [isMember, loadNextPage]);

  return (
      <main className="min-h-screen bg-black text-white">
        {/* 히어로: T1 Membership (이건 누구나 볼 수 있게 오픈) */}
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
                    href="/membership"
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

        {/* 스토리 슬라이더 (멤버십 전용) */}
        <section className="w-full bg-[#111111]">
          <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
            {membershipLoading ? (
                <LockedSection message="멤버십 상태 확인 중입니다." />
            ) : isMember ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-semibold">
                      멤버십 전용 스토리
                    </h2>
                    <span className="text-xs text-gray-400">
                  선수들이 올리는 스토리를 멤버십으로 만나보세요.
                </span>
                  </div>

                  <div className="relative">
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                      {STORY_CARDS.map(card => (
                          <div
                              key={card.id}
                              className="min-w-[150px] max-w-[170px] rounded-2xl p-[1px]"
                              style={{
                                backgroundImage: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})`,
                              }}
                          >
                            <div className="flex h-40 flex-col justify-between rounded-2xl bg-[#171717] p-3">
                              <div className="text-[11px] font-semibold text-white/90 flex items-center gap-1">
                                <span>{card.label}</span>
                                {card.locked && <span>🔒</span>}
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-14 w-14 rounded-full border-2 border-white/80 bg-black overflow-hidden">
                                  <img
                                      src={card.avatarUrl}
                                      alt={card.nickname}
                                      className="h-full w-full object-cover"
                                  />
                                </div>
                                <span className="text-xs font-semibold">
                            {card.nickname}
                          </span>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
                      <div className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/70">
                        <span className="text-xs">{">"}</span>
                      </div>
                    </div>
                  </div>
                </>
            ) : (
                <LockedSection message="선수 스토리는 멤버십 회원에게만 공개됩니다." />
            )}
          </div>
        </section>

        {/* 트위터 / 인스타 카드 (멤버십 전용) */}
        <section className="w-full bg-[#111111]">
          <div className="mx-auto max-w-6xl px-4 pb-8 md:pb-10">
            {membershipLoading ? (
                <LockedSection message="멤버십 상태 확인 중입니다." />
            ) : isMember ? (
                <>
                  {/* 트위터 */}
                  <div className="mb-6">
                    <p className="text-xs text-gray-400 mb-2">@T1LoL</p>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                      {TWITTER_CARDS.map(card => (
                          <a
                              key={card.id}
                              href={card.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block min-w-[220px] max-w-[260px]"
                          >
                            <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-900">
                              <img
                                  src={card.imageUrl}
                                  alt={card.alt}
                                  className="h-full w-full object-cover"
                              />
                            </div>
                          </a>
                      ))}
                    </div>
                  </div>

                  {/* 인스타 */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">@t1lol</p>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                      {INSTAGRAM_CARDS.map(card => (
                          <a
                              key={card.id}
                              href={card.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block min-w-[220px] max-w-[260px]"
                          >
                            <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-900">
                              <img
                                  src={card.imageUrl}
                                  alt={card.alt}
                                  className="h-full w-full object-cover"
                              />
                            </div>
                          </a>
                      ))}
                    </div>
                  </div>
                </>
            ) : (
                <LockedSection message="SNS 카드 콘텐츠는 멤버십 회원에게만 제공됩니다." />
            )}
          </div>
        </section>

        {/* 메인 피드 (유튜브 + 공지, 멤버십 전용) */}
        <section className="w-full bg-black">
          <div className="mx-auto max-w-6xl px-4 pb-12 md:pb-16">
            <h2 className="mb-4 text-lg md:text-xl font-semibold">T1 Feed</h2>

            {membershipLoading ? (
                <LockedSection message="멤버십 상태 확인 중입니다." />
            ) : isMember ? (
                <>
                  <MainFeedGrid items={items} />

                  <div className="mt-4 text-center text-xs text-gray-400">
                    {loading && !errorMsg && <p>불러오는 중입니다…</p>}
                    {errorMsg && <p>{errorMsg}</p>}
                    {!loading && !errorMsg && items.length === 0 && (
                        <p>표시할 피드가 없습니다.</p>
                    )}
                    {last && !loading && items.length > 0 && !errorMsg && (
                        <p>마지막 피드까지 다 봤습니다.</p>
                    )}
                  </div>

                  <div ref={sentinelRef} className="h-8 w-full" />
                </>
            ) : (
                <LockedSection message="유튜브 및 공지사항 피드는 멤버십 회원만 볼 수 있습니다." />
            )}
          </div>
        </section>
      </main>
  );
}
