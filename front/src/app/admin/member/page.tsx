// src/app/admin/members/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import axios, { AxiosError } from "axios";

// ===== 타입 정의 =====

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

// /member/readAll DTO (추정)
interface ReadAllMemberRes {
    memberEmail: string;
    memberName?: string;
    memberNickName?: string;
    memberRole?: string;      // "USER", "ADMIN", "BLACKLIST" 등
    createdAt?: string;
    lastLoginAt?: string;
}

// /member/my_page/{memberEmail} DTO (추정)
interface ReadOneMemberRes {
    memberEmail: string;
    memberName?: string;
    memberNickName?: string;
    memberPhone?: string;
    memberAddress?: string;
    memberRole?: string;
    memberGender?: string;
    memberBirthY?: string;
}

// 에러 응답 최소 필드
interface ErrorBody {
    resMessage?: string;
    message?: string;
}

// ===== 유틸 =====

function formatDate(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const HH = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

function getRoleLabel(role?: string) {
    if (!role) return "일반회원";
    if (role === "ADMIN" || role === "ROLE_ADMIN") return "관리자";
    if (role === "BLACKLIST") return "블랙리스트";
    return "일반회원";
}

function getRoleBadgeClass(role?: string) {
    if (role === "ADMIN" || role === "ROLE_ADMIN") {
        return "bg-red-600/20 text-red-400";
    }
    if (role === "BLACKLIST") {
        return "bg-zinc-700 text-zinc-300 line-through";
    }
    return "bg-zinc-800 text-zinc-200";
}

// ===== 메인 컴포넌트 =====

export default function AdminMembersPage() {
    const [members, setMembers] = useState<ReadAllMemberRes[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "ADMIN" | "BLACKLIST">("ALL");

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailMember, setDetailMember] = useState<ReadOneMemberRes | null>(null);

    // ===== 목록 불러오기 =====
    const fetchMembers = async () => {
        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await apiClient.get<ApiResult<ReadAllMemberRes[]>>("/member/readAll");
            const body = res.data;
            const list = body.result ?? [];
            setMembers(list);
        } catch (e) {
            console.error("[AdminMembers] fetchMembers error", e);

            if (axios.isAxiosError(e)) {
                const err = e as AxiosError<ErrorBody>;
                const data = err.response?.data;
                const msg =
                    data?.resMessage ??
                    data?.message ??
                    "회원 목록을 불러오는 중 오류가 발생했습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("회원 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== 검색/필터된 목록 =====
    const filteredMembers = useMemo(() => {
        return members.filter((m) => {
            // 역할 필터
            if (roleFilter !== "ALL") {
                const r = m.memberRole ?? "";
                if (roleFilter === "USER") {
                    if (r === "ADMIN" || r === "ROLE_ADMIN" || r === "BLACKLIST") return false;
                } else if (roleFilter === "ADMIN") {
                    if (!(r === "ADMIN" || r === "ROLE_ADMIN")) return false;
                } else if (roleFilter === "BLACKLIST") {
                    if (r !== "BLACKLIST") return false;
                }
            }

            // 키워드 필터
            const k = keyword.trim().toLowerCase();
            if (!k) return true;

            const email = m.memberEmail?.toLowerCase() ?? "";
            const name = m.memberName?.toLowerCase() ?? "";
            const nick = m.memberNickName?.toLowerCase() ?? "";

            return email.includes(k) || name.includes(k) || nick.includes(k);
        });
    }, [members, keyword, roleFilter]);

    const handleResetFilter = () => {
        setKeyword("");
        setRoleFilter("ALL");
    };

    // ===== 상세 불러오기 =====
    const openDetail = async (memberEmail: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailMember(null);

        try {
            const res = await apiClient.get<ApiResult<ReadOneMemberRes>>(
                `/member/my_page/${encodeURIComponent(memberEmail)}`,
            );
            setDetailMember(res.data.result);
        } catch (e) {
            console.error("[AdminMembers] openDetail error", e);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 타이틀 */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">회원 관리</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        전체 회원 {members.length.toLocaleString()}명
                    </p>
                </div>
                <button
                    onClick={fetchMembers}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs md:text-sm"
                    disabled={loading}
                >
                    새로고침
                </button>
            </div>

            {/* 검색/필터 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 md:p-4">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-red-500"
                        placeholder="이메일 / 닉네임 / 이름으로 검색"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none"
                        value={roleFilter}
                        onChange={(e) =>
                            setRoleFilter(
                                e.target.value as "ALL" | "USER" | "ADMIN" | "BLACKLIST",
                            )
                        }
                    >
                        <option value="ALL">전체 역할</option>
                        <option value="USER">일반회원</option>
                        <option value="ADMIN">관리자</option>
                        <option value="BLACKLIST">블랙리스트</option>
                    </select>

                    <button
                        onClick={handleResetFilter}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs md:text-sm"
                    >
                        초기화
                    </button>
                </div>
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                    {errorMsg}
                </div>
            )}

            {/* 목록 테이블 */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-900 border-b border-zinc-800">
                        <tr className="text-left text-zinc-400">
                            <th className="px-4 py-3">이메일</th>
                            <th className="px-4 py-3">이름</th>
                            <th className="px-4 py-3">닉네임</th>
                            <th className="px-4 py-3">역할</th>
                            <th className="px-4 py-3">가입일</th>
                            <th className="px-4 py-3">최근 로그인</th>
                            <th className="px-4 py-3 text-right">관리</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading && members.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-6 text-center text-zinc-400"
                                >
                                    회원 목록을 불러오는 중입니다...
                                </td>
                            </tr>
                        )}

                        {!loading && filteredMembers.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-6 text-center text-zinc-400"
                                >
                                    조회된 회원이 없습니다.
                                </td>
                            </tr>
                        )}

                        {filteredMembers.map((m) => (
                            <tr
                                key={m.memberEmail}
                                className="border-t border-zinc-800 hover:bg-zinc-900/60"
                            >
                                <td className="px-4 py-3 font-mono text-xs md:text-sm">
                                    {m.memberEmail}
                                </td>
                                <td className="px-4 py-3">{m.memberName || "-"}</td>
                                <td className="px-4 py-3">{m.memberNickName || "-"}</td>
                                <td className="px-4 py-3">
                                        <span
                                            className={
                                                "inline-flex items-center px-2 py-1 rounded-full text-xs " +
                                                getRoleBadgeClass(m.memberRole)
                                            }
                                        >
                                            {getRoleLabel(m.memberRole)}
                                        </span>
                                </td>
                                <td className="px-4 py-3 text-zinc-400">
                                    {formatDate(m.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-zinc-400">
                                    {formatDate(m.lastLoginAt)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        className="px-3 py-1 rounded-full border border-zinc-600 hover:border-red-500 hover:text-red-400 text-xs"
                                        onClick={() => openDetail(m.memberEmail)}
                                    >
                                        상세 보기
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 상세 모달 */}
            {detailOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">회원 상세 정보</h3>
                            <button
                                onClick={() => setDetailOpen(false)}
                                className="text-zinc-400 hover:text-white text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {detailLoading && (
                            <div className="text-sm text-zinc-400">
                                상세 정보를 불러오는 중입니다...
                            </div>
                        )}

                        {!detailLoading && !detailMember && (
                            <div className="text-sm text-zinc-400">
                                상세 정보를 불러오지 못했습니다.
                            </div>
                        )}

                        {!detailLoading && detailMember && (
                            <div className="space-y-2 text-sm">
                                <Row label="이메일" value={detailMember.memberEmail} />
                                <Row label="이름" value={detailMember.memberName} />
                                <Row label="닉네임" value={detailMember.memberNickName} />
                                <Row label="연락처" value={detailMember.memberPhone} />
                                <Row label="주소" value={detailMember.memberAddress} />
                                <Row label="성별" value={detailMember.memberGender} />
                                <Row label="출생 연도" value={detailMember.memberBirthY} />
                                <Row
                                    label="역할"
                                    value={getRoleLabel(detailMember.memberRole)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// 상세 행
function Row({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex justify-between gap-4">
            <div className="text-zinc-400">{label}</div>
            <div className="text-zinc-100 text-right break-all">
                {value && value.trim() !== "" ? value : "-"}
            </div>
        </div>
    );
}
