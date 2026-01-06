// src/app/mypage/account/delete/page.tsx
"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function DeleteMemberPage() {
    const [agree, setAgree] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!agree) {
            alert("유의 사항에 동의해야 탈퇴할 수 있습니다.");
            return;
        }

        if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            return;
        }

        try {
            await apiClient.post("/member/delete");

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
            alert("회원 탈퇴에 실패했습니다.");
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
                    className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg text-sm font-semibold"
                >
                    회원 탈퇴
                </button>
            </div>
        </div>
    );
}
