// src/components/admin/AdminGuard.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import axios from "axios";

interface ReadOneMemberRes {
    memberEmail: string;
    memberRole?: string; // "USER" | "ADMIN" | "BLACKLIST"
}

interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

export default function AdminGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        const run = async () => {
            try {
                const res = await apiClient.get<ApiResult<ReadOneMemberRes>>(
                    "/member/readOne",
                );

                const body = res.data;
                const member = body.result;

                const role = member.memberRole;

                if (role === "ADMIN" || role === "ROLE_ADMIN") {
                    setAllowed(true);
                } else {
                    alert("관리자만 접근 가능합니다.");
                    router.replace("/");
                }
            } catch (e) {
                if (axios.isAxiosError(e) && e.response?.status === 401) {
                    alert("로그인이 필요합니다.");
                    router.replace("/login");
                } else {
                    console.error("[AdminGuard] 권한 확인 오류", e);
                    alert("관리자 권한 확인 중 오류가 발생했습니다.");
                    router.replace("/");
                }
            } finally {
                setChecked(true);
            }
        };

        run();
    }, [router]);

    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                관리자 권한 확인 중...
            </div>
        );
    }

    if (!allowed) return null;

    return <>{children}</>;
}
