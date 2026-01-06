"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function PasswordChangePage() {
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const router = useRouter();

    const handleSubmit = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            alert("모든 항목을 입력해 주세요.");
            return;
        }
        if (newPw !== confirmPw) {
            alert("새 비밀번호와 확인이 일치하지 않습니다.");
            return;
        }

        try {
            await apiClient.put("/member/password", {
                currentPassword: currentPw,
                newPassword: newPw,
                confirmPassword: confirmPw,
            });
            alert("비밀번호가 변경되었습니다.");
            router.push("/mypage/account");
        } catch (e: unknown) {
            console.error(e);

            if (typeof e === "object" && e !== null && "response" in e) {
                const err = e as { response?: { data?: { message?: string } } };
                alert(err.response?.data?.message ?? "비밀번호 변경에 실패했습니다.");
            } else {
                alert("비밀번호 변경 중 오류가 발생했습니다.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-xl mx-auto px-6">
                <h1 className="text-2xl font-bold mb-8">비밀번호 변경</h1>

                <PwInput label="현재 비밀번호" value={currentPw} onChange={setCurrentPw} />
                <PwInput label="새 비밀번호" value={newPw} onChange={setNewPw} />
                <PwInput label="비밀번호 확인" value={confirmPw} onChange={setConfirmPw} />

                <button
                    onClick={handleSubmit}
                    className="w-full mt-6 bg-red-600 hover:bg-red-500 py-3 rounded-lg text-sm font-semibold"
                >
                    비밀번호 변경
                </button>
            </div>
        </div>
    );
}

function PwInput(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="mb-4">
            <p className="text-xs mb-1 text-zinc-300">{props.label}</p>
            <input
                type="password"
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
            />
        </div>
    );
}
