"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

type TermDoc = {
    id: string;
    title: string;
    sections: { h: string; p: string[] }[];
};

const TERMS_DOCS: TermDoc[] = [
    {
        id: "61e4f93567264c35863a0925",
        title: "개인정보 수집 및 이용 동의",
        sections: [
            {
                h: "1. 수집 항목(예시)",
                p: [
                    "회원가입 및 서비스 이용을 위해 최소한의 정보를 수집할 수 있습니다.",
                    "예: 이메일(로그인 식별), 닉네임(커뮤니티 표시), 휴대폰 번호(배송/고지), 주소(상품 배송 시) 등",
                ],
            },
            {
                h: "2. 이용 목적",
                p: [
                    "회원 식별 및 서비스 제공(주문/결제/배송/고객지원)",
                    "서비스 품질 개선 및 부정 이용 방지",
                    "법령 준수 및 분쟁 대응",
                ],
            },
            {
                h: "3. 보관 및 파기",
                p: [
                    "서비스 제공에 필요한 기간 동안 보관할 수 있습니다.",
                    "관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관할 수 있습니다.",
                    "보관 기간 종료 시 지체 없이 파기합니다.",
                ],
            },
            {
                h: "4. 동의 거부 안내",
                p: [
                    "필수 항목에 대한 동의를 거부할 경우 서비스 이용이 제한될 수 있습니다.",
                    "선택 항목은 동의하지 않아도 기본 서비스 이용은 가능합니다.",
                ],
            },
        ],
    },
    {
        id: "61e4f93567264c35863a0927",
        title: "청소년보호정책",
        sections: [
            {
                h: "1. 목적",
                p: [
                    "서비스 내 콘텐츠/커뮤니티 이용 시 청소년에게 부적절한 요소를 최소화하기 위한 기준을 제공합니다.",
                ],
            },
            {
                h: "2. 운영 원칙",
                p: [
                    "유해 정보/불법 정보/폭력적·차별적 표현 등에 대해 신고 및 제재 절차를 운영합니다.",
                    "이용자 보호를 위해 운영 정책에 따른 게시물 숨김/삭제/제한 조치가 이루어질 수 있습니다.",
                ],
            },
            {
                h: "3. 신고/문의",
                p: [
                    "유해 게시물은 고객센터 또는 신고 기능으로 제보할 수 있습니다.",
                    "반복 위반 시 이용 제한이 강화될 수 있습니다.",
                ],
            },
        ],
    },
    {
        id: "61e4f93567264c35863a0926",
        title: "개인정보처리방침",
        sections: [
            {
                h: "1. 처리 원칙",
                p: [
                    "서비스 제공을 위해 필요한 최소한의 개인정보만 처리합니다.",
                    "목적 외 이용을 제한하고, 안전하게 보호하기 위한 기술적·관리적 조치를 취합니다.",
                ],
            },
            {
                h: "2. 제3자 제공/위탁(있을 경우)",
                p: [
                    "결제/배송 등 서비스 제공을 위해 불가피한 경우에 한해 제한적으로 제공 또는 위탁할 수 있습니다.",
                    "제공/위탁 대상과 범위는 서비스 화면 또는 공지로 안내합니다.",
                ],
            },
            {
                h: "3. 이용자 권리",
                p: [
                    "이용자는 자신의 개인정보 열람/정정/삭제를 요청할 수 있습니다.",
                    "요청은 마이페이지 또는 고객센터를 통해 진행할 수 있습니다.",
                ],
            },
            {
                h: "4. 보안",
                p: [
                    "접근 통제, 암호화, 로그 관리 등 보안 조치를 적용할 수 있습니다.",
                    "개인정보 침해가 의심될 경우 즉시 고객센터로 문의해 주세요.",
                ],
            },
        ],
    },
    {
        id: "6347cbcb886a8118029f0c41",
        title: "커뮤니티 이용 약관",
        sections: [
            {
                h: "1. 기본 원칙",
                p: [
                    "서로를 존중하며 건전한 커뮤니티 문화를 지향합니다.",
                    "타인의 권리를 침해하거나 불쾌감을 주는 행위를 금지합니다.",
                ],
            },
            {
                h: "2. 금지 행위(예시)",
                p: [
                    "욕설/비방/혐오/차별/폭력 조장",
                    "개인정보 노출(본인/타인) 및 사생활 침해",
                    "불법 정보 유통, 스팸/도배/광고",
                ],
            },
            {
                h: "3. 운영 조치",
                p: [
                    "운영 정책에 따라 게시물 삭제/숨김, 이용 제한, 계정 제재가 이루어질 수 있습니다.",
                    "반복 위반 또는 중대한 위반은 즉시 제재될 수 있습니다.",
                ],
            },
        ],
    },
    {
        id: "61e4f93567264c35863a0924",
        title: "이용약관",
        sections: [
            {
                h: "1. 서비스 개요",
                p: [
                    "본 약관은 서비스 이용과 관련된 기본 조건을 설명합니다.",
                    "회원은 약관에 동의한 후 서비스를 이용할 수 있습니다.",
                ],
            },
            {
                h: "2. 회원 계정",
                p: [
                    "회원은 자신의 계정 정보를 안전하게 관리해야 합니다.",
                    "부정 이용이 발견될 경우 이용 제한이 있을 수 있습니다.",
                ],
            },
            {
                h: "3. 주문/결제/환불(해당 시)",
                p: [
                    "상품/멤버십/이용권 등 유료 서비스는 결제 완료 후 제공됩니다.",
                    "취소/환불 기준은 상품 특성 및 결제 정책에 따라 달라질 수 있습니다.",
                ],
            },
            {
                h: "4. 변경 및 공지",
                p: [
                    "서비스 개선을 위해 약관 또는 정책이 변경될 수 있습니다.",
                    "중요 변경은 서비스 화면을 통해 안내합니다.",
                ],
            },
        ],
    },
];

export default function TermDetailPage() {
    const router = useRouter();
    const params = useParams<{ termId: string }>();
    const termId = params?.termId;

    const doc = useMemo(
        () => TERMS_DOCS.find((d) => d.id === termId),
        [termId]
    );

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />

            <main className="pt-20 pb-16">
                <div className="max-w-5xl mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-3 mb-8">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                        >
                            ←
                        </button>
                        <h1 className="text-lg md:text-2xl font-bold">
                            {doc?.title ?? "이용약관"}
                        </h1>
                    </div>

                    <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-5 md:p-8">
                        {!doc ? (
                            <div className="text-sm text-zinc-300 leading-7">
                                해당 약관 문서를 찾지 못했습니다.
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {doc.sections.map((s, i) => (
                                    <section key={`${doc.id}-${i}`} className="space-y-3">
                                        <h2 className="text-base md:text-lg font-semibold">
                                            {s.h}
                                        </h2>
                                        <div className="space-y-2">
                                            {s.p.map((line, j) => (
                                                <p
                                                    key={`${doc.id}-${i}-${j}`}
                                                    className="text-sm md:text-[15px] leading-7 text-zinc-200"
                                                >
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    </section>
                                ))}

                                <div className="pt-6 mt-8 border-t border-zinc-800 text-xs text-zinc-500 leading-6">
                                    ※ 위 내용은 “프로젝트용 템플릿” 예시입니다. 실제 서비스 운영 시에는
                                    법무/정책 기준에 맞게 문구를 작성/검토하여 반영하세요.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
