// src/app/mypage/account/delete/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

export default function DeleteMemberPage() {
    const [agree, setAgree] = useState(false);
    const [password, setPassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!agree) {
            alert("유의 사항에 동의해야 탈퇴할 수 있습니다.");
            return;
        }

        if (!password.trim()) {
            alert("현재 비밀번호를 입력해주세요.");
            return;
        }

        if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            return;
        }

        setDeleting(true);

        try {
            // 🔥 DeleteMemberReq.currentPw 와 이름을 정확히 맞춰서 보냄
            await apiClient.post(
                "/member/delete",
                {
                    currentPw: password,
                    // memberEmail 은 백엔드에서 Authentication 기준으로 덮어쓰기 때문에 안 보내도 됨
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            // 토큰 제거
            if (typeof window !== "undefined") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.dispatchEvent(new Event("loginStateChange"));
            }

            alert("회원 탈퇴가 완료되었습니다.");
            router.push("/");
        } catch (e) {
            console.error(e);

            if (axios.isAxiosError(e)) {
                const status = e.response?.status;
                const data: any = e.response?.data;
                const msg = data?.resMessage || data?.message;

                if (status === 400) {
                    alert(msg || "비밀번호가 일치하지 않습니다.");
                } else if (status === 401) {
                    alert("로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.");
                    router.push("/login");
                } else if (status === 403) {
                    alert("본인 또는 관리자만 탈퇴할 수 있습니다.");
                } else if (status === 404) {
                    alert("회원을 찾을 수 없습니다.");
                } else {
                    alert("회원 탈퇴 중 서버 오류가 발생했습니다.");
                }
            } else {
                alert("회원 탈퇴 중 알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-3xl mx-auto px-6">
                <h1 className="text-2xl font-bold mb-6">회원 탈퇴</h1>

                <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1 mb-6">
                    <li>기존에 등록한 콘텐츠와 댓글은 삭제되지 않을 수 있습니다.</li>
                    <li>사용 중인 이용권, 포인트 등은 모두 소멸되며 복구가 불가능합니다.</li>
                    <li>배송이 완료되지 않은 주문은 정상 배송되지만, 탈퇴 후 조회가 어려울 수 있습니다.</li>
                    <li>법령에 따라 보관해야 하는 정보는 관련 규정에 따라 일정 기간 보관될 수 있습니다.</li>
                </ul>

                {/* 비밀번호 재입력 */}
                <div className="mb-6">
                    <label className="block text-sm mb-1">
                        비밀번호 재입력 <span className="text-zinc-500">(필수)</span>
                    </label>
                    <input
                        type="password"
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="현재 비밀번호를 입력하세요"
                    />
                </div>

                {/* 유의사항 동의 체크박스 */}
                <label className="flex items-center gap-2 text-sm mb-6">
                    <input
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span>유의 사항을 모두 확인했으며 동의합니다.</span>
                </label>

                <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
                    disabled={deleting}
                >
                    {deleting ? "탈퇴 처리 중..." : "회원 탈퇴"}
                </button>
            </div>
        </div>
    );
}
