// src/app/mypage/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

// 형님 백엔드 ApiResult 래퍼 타입
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// /member/readOne 응답용 회원 정보
interface MemberInfo {
    memberEmail: string;
    memberName: string;
    memberGender?: string;
    memberBirthY?: number | null;
    memberPhone?: string | null; // "+82 01012345678" 이런 형태라고 가정
}

export default function MemberEditPage() {
    const router = useRouter();

    // 상태
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 원본 정보
    const [member, setMember] = useState<MemberInfo | null>(null);

    // 입력값 상태 (티원 화면 기준 4개 + 국가코드)
    const [name, setName] = useState("");
    const [gender, setGender] = useState("");
    const [birthYear, setBirthYear] = useState("");
    const [countryCode, setCountryCode] = useState("+82");
    const [phone, setPhone] = useState("");

    // ==============================
    //   최초 진입 시 회원정보 조회
    // ==============================
    useEffect(() => {
        const load = async () => {
            try {
                const token =
                    typeof window !== "undefined"
                        ? localStorage.getItem("accessToken")
                        : null;

                if (!token) {
                    alert("로그인이 필요합니다.");
                    router.push("/login");
                    return;
                }

                const res = await apiClient.get<ApiResult<MemberInfo>>(
                    "/member/readOne"
                );
                const data = res.data.result;

                setMember(data);

                // 이름
                setName(data.memberName ?? "");

                // 성별
                setGender(data.memberGender ?? "");

                // 출생 연도
                if (data.memberBirthY !== null && data.memberBirthY !== undefined) {
                    setBirthYear(String(data.memberBirthY));
                } else {
                    setBirthYear("");
                }

                // 전화번호 → 국가코드 / 번호 분리 (예: "+82 01012345678")
                if (data.memberPhone) {
                    const raw = data.memberPhone.trim();
                    if (raw.startsWith("+")) {
                        const parts = raw.split(/\s+/);
                        const cc = parts[0];
                        const pn = parts.slice(1).join(" ");
                        setCountryCode(cc || "+82");
                        setPhone(pn || "");
                    } else {
                        setCountryCode("+82");
                        setPhone(raw);
                    }
                } else {
                    setCountryCode("+82");
                    setPhone("");
                }
            } catch (error) {
                console.error("[MemberEdit] readOne error =", error);
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    alert("다시 로그인 해주세요.");
                    router.push("/login");
                } else {
                    alert("회원 정보를 불러오지 못했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router]);

    // ==============================
    //   수정하기 버튼 클릭
    //   → JSON PUT /member/modify
    // ==============================
    const handleSave = async () => {
        if (!member) return;
        if (saving) return;

        // 간단 유효성 검사
        if (!name.trim()) {
            alert("이름을 입력해주세요.");
            return;
        }
        if (!gender) {
            alert("성별을 선택해주세요.");
            return;
        }
        if (!birthYear.trim()) {
            alert("출생 연도를 입력해주세요.");
            return;
        }
        if (!phone.trim()) {
            alert("전화번호를 입력해주세요.");
            return;
        }

        const birthYearNum = Number(birthYear);
        if (Number.isNaN(birthYearNum)) {
            alert("출생 연도는 숫자로 입력해주세요.");
            return;
        }

        setSaving(true);
        try {
            const memberPhone = `${countryCode} ${phone}`.trim();

            await apiClient.put(
                "/member/modify",
                {
                    // memberEmail 은 서비스에서 SecurityContext 기준으로 잡음
                    memberName: name,
                    memberGender: gender,
                    memberBirthY: birthYearNum,
                    memberPhone: memberPhone,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            alert("회원정보가 수정되었습니다.");
            router.push("/mypage");
        } catch (error) {
            console.error("[MemberEdit] modify error =", error);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 400) {
                    alert("입력값이 잘못되었습니다. 다시 확인해주세요.");
                } else if (status === 401) {
                    alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
                    router.push("/login");
                } else if (status === 403) {
                    alert("수정 권한이 없습니다.");
                } else if (status === 404) {
                    alert("대상 회원을 찾을 수 없습니다.");
                } else {
                    alert("회원정보 수정 중 서버 오류가 발생했습니다.");
                }
            } else {
                alert("회원정보 수정 중 알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setSaving(false);
        }
    };

    // ==============================
    //   로딩 상태 / 에러 상태
    // ==============================
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <span className="text-sm">회원 정보를 불러오는 중입니다…</span>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="text-sm">
          회원 정보를 불러오지 못했습니다. 다시 시도해주세요.
        </span>
            </div>
        );
    }

    // ==============================
    //   실제 화면 (티원 스타일로 구성)
    // ==============================
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-3xl mx-auto px-4 py-10">
                {/* 제목 */}
                <h1 className="text-2xl font-bold mb-8">회원정보 변경</h1>

                {/* 이름 */}
                <div className="mb-5">
                    <label className="block text-sm mb-1">
                        이름 <span className="text-zinc-500">(필수)</span>
                    </label>
                    <input
                        className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-zinc-400"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름을 입력해주세요."
                    />
                </div>

                {/* 성별 */}
                <div className="mb-5">
                    <label className="block text-sm mb-1">
                        성별 <span className="text-zinc-500">(필수)</span>
                    </label>
                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm appearance-none focus:outline-none focus:border-zinc-400"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                        >
                            <option value="">선택해주세요</option>
                            <option value="FEMALE">여자</option>
                            <option value="MALE">남자</option>
                        </select>
                        {/* ▼ 아이콘 느낌 (순수 CSS) */}
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              ▼
            </span>
                    </div>
                </div>

                {/* 출생 연도 */}
                <div className="mb-5">
                    <label className="block text-sm mb-1">
                        출생 연도 <span className="text-zinc-500">(필수)</span>
                    </label>
                    <input
                        type="number"
                        className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-zinc-400"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        placeholder="예) 1999"
                    />
                </div>

                {/* 전화번호 (국가코드 + 번호) */}
                <div className="mb-8">
                    <label className="block text-sm mb-1">
                        전화번호 <span className="text-zinc-500">(필수)</span>
                    </label>
                    <div className="flex gap-2">
                        {/* 국가코드 드롭다운 */}
                        <div className="w-32">
                            <select
                                className="w-full px-3 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm appearance-none focus:outline-none focus:border-zinc-400"
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                            >
                                <option value="+82">+82</option>
                                <option value="+81">+81</option>
                                <option value="+1">+1</option>
                                <option value="+86">+86</option>
                                {/* 필요하면 더 추가 */}
                            </select>
                        </div>

                        {/* 실제 번호 입력 */}
                        <input
                            className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-zinc-400"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01012345678"
                        />
                    </div>
                </div>

                {/* 수정하기 버튼 */}
                <button
                    type="button"
                    className="w-full py-3 rounded-lg bg-[#e51b24] hover:bg-[#ff232d] text-sm font-semibold disabled:opacity-60"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "수정 중..." : "수정하기"}
                </button>
            </div>
        </div>
    );
}
