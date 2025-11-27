// src/app/mypage/home/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import Header from "@/components/layout/Header";
import { apiClient } from "@/lib/apiClient";
import {logout} from "@/lib/authClient";

interface MemberSummary {
    memberNickName: string;
    memberEmail: string;
    profileImageUrl?: string | null;
}

export default function MyPageHome() {
    const router = useRouter();
    const [member, setMember] = useState<MemberSummary | null>(null);
    const [loading, setLoading] = useState(true);

    // 🔥 로그아웃 모달 on/off
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const run = async () => {
            try {
                const token =
                    typeof window !== "undefined"
                        ? localStorage.getItem("accessToken")
                        : null;

                if (!token) {
                    alert("로그인이 필요합니다.");
                    router.replace("/login");
                    return;
                }

                const res = await apiClient.get("/member/readOne");
                const raw = res.data;
                const result = raw?.result ?? raw?.data ?? raw;

                const summary: MemberSummary = {
                    memberNickName: result.memberNickName ?? "닉네임 없음",
                    memberEmail: result.memberEmail ?? "",
                    profileImageUrl: result.profileImageUrl ?? null,
                };

                setMember(summary);
            } catch (e) {
                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("refreshToken");
                        localStorage.removeItem("memberEmail");
                        window.dispatchEvent(new Event("loginStateChange"));
                    }
                    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
                    router.replace("/login");
                    return;
                }
                console.error("[MyPageHome] 회원 정보 조회 실패", e);
            } finally {
                setLoading(false);
            }
        };

        void run();
    }, [router]);

    const go = (path: string) => () => router.push(path);

    const menuItem = (label: string, onClick?: () => void) => (
        <button
            key={label}
            onClick={onClick}
            className="w-full flex items-center justify-between py-3 border-b border-zinc-800 text-sm hover:bg-zinc-900/60"
        >
            <span>{label}</span>
            <span className="text-zinc-500 text-xs">{">"}</span>
        </button>
    );

    // 🔥 모달에서 "로그아웃" 버튼 눌렀을 때 실제 로그아웃 처리
    const handleConfirmLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("memberEmail");
            window.dispatchEvent(new Event("loginStateChange"));
        }
        setShowLogoutModal(false);
        router.replace("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                로딩 중...
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                회원 정보를 불러오지 못했습니다.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />

            <main className="pt-16 pb-12 max-w-3xl mx-auto px-4">
                {/* 상단 프로필 카드 */}
                <section
                    className="bg-zinc-900 rounded-2xl p-4 md:p-6 flex items-center gap-4 cursor-pointer hover:bg-zinc-800 transition"
                    onClick={go("/mypage")} // 프로필 눌렀을 때 내 정보 관리로
                >
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center overflow-hidden">
                        {member.profileImageUrl ? (
                            <Image
                                src={member.profileImageUrl}
                                alt="프로필 이미지"
                                width={64}
                                height={64}
                                className="w-16 h-16 object-cover"
                            />
                        ) : (
                            <span className="text-xl font-bold">
                                {member.memberNickName?.[0] ?? "T"}
                            </span>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="text-base font-semibold">
                            {member.memberNickName}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                            {member.memberEmail}
                        </div>
                    </div>
                </section>

                {/* 이용권 / 포인트 */}
                <section className="mt-4 grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div className="bg-zinc-900 rounded-xl p-3 flex flex-col justify-center">
                        <div className="text-zinc-400">내 이용권/티켓</div>
                        <div className="mt-1 text-lg font-semibold">0</div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-3 flex flex-col justify-center">
                        <div className="text-zinc-400">T1 Point</div>
                        <div className="mt-1 text-lg font-semibold">0P</div>
                    </div>
                </section>

                {/* 아래 메뉴 리스트 */}
                <section className="mt-8 bg-zinc-900 rounded-2xl p-2 text-sm">
                    {menuItem("멤버십 가입하기")}
                    {menuItem("주문 내역", go("/mypage/orders"))}
                    {menuItem("내가 쓴 글", go("/community/my-posts"))}
                    {menuItem("내 정보 관리", go("/mypage"))}
                    {menuItem("내 리워드")}
                    {menuItem("언어")}
                    {menuItem("통화")}
                    {menuItem("알림 설정")}
                    {menuItem("이용약관")}
                    {menuItem("고객센터")}
                    {menuItem("이벤트")}
                    {menuItem("공지사항")}
                    {menuItem("로그아웃", () => setShowLogoutModal(true))}
                </section>
            </main>

            {/* 🔥 로그아웃 확인 모달 */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-sm rounded-2xl bg-zinc-900 px-6 py-5 shadow-xl">
                        <p className="text-center text-sm font-semibold mb-6">
                            로그아웃 할까요?
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 py-2 rounded-lg bg-zinc-700 text-sm"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    logout();       // ← 반드시 이 함수를 호출해야 서버 로그아웃 처리됨
                                    setShowLogoutModal(false);
                                }}
                                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold"
                            >
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
