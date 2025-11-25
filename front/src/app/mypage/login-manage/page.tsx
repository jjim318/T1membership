// src/app/mypage/account/login-manage/page.tsx
"use client";

export default function LoginManagePage() {
    const handleClick = () => {
        alert("여기는 나중에 모든 기기에서 로그아웃 API 붙일 자리입니다, 보스.");
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-16">
            <div className="max-w-2xl mx-auto px-6">
                <h1 className="text-2xl font-bold mb-6">로그인 관리</h1>

                <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                    현재 사용 중인 기기를 제외한 다른 기기에서는 자동으로 로그아웃됩니다.
                    연결된 서비스는 계속 이용할 수 있습니다.
                </p>

                <button
                    onClick={handleClick}
                    className="mt-4 text-sm text-blue-400 hover:underline"
                >
                    모든 기기에서 로그아웃
                </button>
            </div>
        </div>
    );
}
