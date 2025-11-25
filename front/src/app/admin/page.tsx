// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

interface DashboardStats {
    totalMembers: number;
    todayJoin: number;
    totalOrders: number;
    todayOrders: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        // 🔥 대시보드용 API 나중에 만들면 여기서 호출
        // 일단은 더미 데이터로
        setStats({
            totalMembers: 0,
            todayJoin: 0,
            totalOrders: 0,
            todayOrders: 0,
        });
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">관리자 대시보드</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">전체 회원 수</div>
                    <div className="text-2xl font-semibold">
                        {stats?.totalMembers ?? "-"}
                    </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">오늘 가입</div>
                    <div className="text-2xl font-semibold">
                        {stats?.todayJoin ?? "-"}
                    </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">전체 주문 수</div>
                    <div className="text-2xl font-semibold">
                        {stats?.totalOrders ?? "-"}
                    </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">오늘 주문</div>
                    <div className="text-2xl font-semibold">
                        {stats?.todayOrders ?? "-"}
                    </div>
                </div>
            </div>
        </div>
    );
}
