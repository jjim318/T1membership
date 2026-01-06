// src/app/shop/[itemNo]/_components/ToastCartAdded.tsx
"use client";

import { useRouter } from "next/navigation";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function ToastCartAdded({ visible, onClose }: Props) {
    const router = useRouter();

    if (!visible) return null;

    return (
        <div
            className="fixed"
            style={{
                left: 16,
                bottom: 16,
                top: "auto",
                zIndex: 9999,
            }}
        >
            <div
                className="flex items-center gap-4 rounded-md px-4 py-3 text-sm shadow-lg"
                style={{
                    backgroundColor: "#ffffff",
                    color: "#111111",
                }}
            >
                <span>장바구니에 상품을 담았어요.</span>
                <button
                    type="button"
                    onClick={() => {
                        onClose();
                        router.push("/shop/cart");
                    }}
                    style={{ color: "#0b74de", fontWeight: 600 }}
                >
                    보러가기
                </button>
            </div>
        </div>
    );
}
