// src/app/mypage/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { ApiResult, MemberInfo } from "@/types/member";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function MemberEditPage() {
    const [name, setName] = useState("");
    const [gender, setGender] = useState("");                 // 성별
    const [birthYear, setBirthYear] = useState("");
    const [countryCode, setCountryCode] = useState("+82");    // 국가코드
    const [phone, setPhone] = useState("");
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                // 비로그인 상태면 로그인으로
                if (typeof window !== "undefined") {
                    const token = localStorage.getItem("accessToken");
                    if (!token) {
                        alert("로그인이 필요합니다.");
                        router.push("/login");
                        return;
                    }
                }

                const res = await apiClient.get<ApiResult<MemberInfo>>(
                    "/member/readOne"
                );
                console.log("readOne(edit) =", res.data);

                const d = res.data.result;
                if (!d) {
                    alert("회원 정보를 찾을 수 없습니다.");
                    return;
                }

                // 기존 정보로 state 초기화
                setName(d.memberName ?? "");
                setGender(d.gender ?? "");                           // "FEMALE" / "MALE"
                setBirthYear(d.birthYear ? String(d.birthYear) : "");
                setCountryCode(d.phoneCountryCode ?? "+82");
                setPhone(d.memberPhone ?? "");
            } catch (e: unknown) {
                console.error(e);

                // 토큰 만료 등 401 → 로그인 페이지로
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
        form.append("gender", gender);                 // 성별
        form.append("birthYear", birthYear);
        form.append("phoneCountryCode", countryCode);  // 국가코드
        form.append("memberPhone", phone);

        try {
            await apiClient.post("/member/modify", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert("회원정보가 수정되었습니다.");
            router.push("/mypage");
        } catch (e) {
            console.error(e);
            alert("수정에 실패했습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-xl mx-auto px-6">
                <h1 className="text-2xl font-bold mb-8">회원정보 변경</h1>

                {/* 이름 */}
                <Field label="이름 (필수)">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
                    />
                </Field>

                {/* 성별 */}
                <Field label="성별 (필수)">
                    <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
                    >
                        <option value="">선택 안 함</option>
                        <option value="FEMALE">여자</option>
                        <option value="MALE">남자</option>
                    </select>
                </Field>

                {/* 출생 연도 */}
                <Field label="출생 연도 (필수)">
                    <input
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        placeholder="YYYY"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
                    />
                </Field>

                {/* 전화번호: 국가코드 + 번호 */}
                <Field label="전화번호 (필수)">
                    <div className="flex gap-2">
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm outline-none focus:border-red-500"
                        >
                            <option value="+82">+82</option>
                            <option value="+81">+81</option>
                            <option value="+1">+1</option>
                            {/* 필요하면 더 추가 */}
                        </select>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01012345678"
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
                        />
                    </div>
                </Field>

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

function Field(props: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <p className="text-xs mb-1 text-zinc-300">{props.label}</p>
            {props.children}
        </div>
    );
}
