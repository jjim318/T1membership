// src/app/mypage/account/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { apiClient, MemberInfo } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function MemberEditPage() {
    const [name, setName] = useState("");
    const [birthYear, setBirthYear] = useState("");
    const [phone, setPhone] = useState("");
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                // 🚩 비로그인 상태면 바로 로그인 페이지로
                if (typeof window !== "undefined") {
                    const token = localStorage.getItem("accessToken");
                    if (!token) {
                        alert("로그인이 필요합니다.");
                        router.push("/login");
                        return;
                    }
                }

                const res = await apiClient.get<{ data: MemberInfo }>("/member/readOne");
                const d = res.data.data;

                setName(d.memberName ?? "");
                setBirthYear(d.birthYear ? String(d.birthYear) : "");
                setPhone(d.memberPhone ?? "");
            } catch (e: unknown) {
                console.error(e);

                // ✅ AxiosError 이면서 401이면 → 로그인 만료로 간주
                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    alert("로그인이 필요합니다. 다시 로그인해 주세요.");
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("refreshToken");
                    }
                    router.push("/login");
                    return;
                }

                alert("회원 정보를 불러오지 못했습니다.");
            }
        };

        load();
    }, [router]);

    const handleSave = async () => {
        if (!name || !birthYear || !phone) {
            alert("필수 정보를 모두 입력해 주세요.");
            return;
        }

        const form = new FormData();
        form.append("memberName", name);
        form.append("birthYear", birthYear);
        form.append("memberPhone", phone);

        try {
            await apiClient.post("/member/modify", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert("회원정보가 수정되었습니다.");
            router.push("/mypage/account");
        } catch (e) {
            console.error(e);
            alert("수정에 실패했습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-xl mx-auto px-6">
                <h1 className="text-2xl font-bold mb-8">회원정보 변경</h1>

                <Field label="이름 (필수)" value={name} onChange={setName} />
                <Field
                    label="출생 연도 (필수)"
                    value={birthYear}
                    onChange={setBirthYear}
                    placeholder="YYYY"
                />
                <Field
                    label="전화번호 (필수)"
                    value={phone}
                    onChange={setPhone}
                    placeholder="01012345678"
                />

                <button
                    onClick={handleSave}
                    className="w-full mt-6 bg-red-600 hover:bg-red-500 py-3 rounded-lg text-sm font-semibold"
                >
                    수정하기
                </button>
            </div>
        </div>
    );
}

function Field(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="mb-4">
            <p className="text-xs mb-1 text-zinc-300">{props.label}</p>
            <input
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                placeholder={props.placeholder}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
            />
        </div>
    );
}
