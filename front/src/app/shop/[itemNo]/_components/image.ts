const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function toImageSrc(raw?: string | null, context = "Detail"): string {
    if (!raw) return "";

    const url = raw.trim();
    if (!url) return "";

    // 절대 URL
    if (/^https?:\/\//i.test(url)) return url;

    // /files/**
    if (url.startsWith("/files/")) return `${API_BASE}${url}`;

    // files/**
    if (url.startsWith("files/")) return `${API_BASE}/${url}`;

    // 파일명만 온 경우 (공백/한글 포함)
    if (!url.includes("/")) {
        return `${API_BASE}/files/${encodeURIComponent(url)}`;
    }

    // 예외 케이스 → 파일명만 추출해서 강제 보정
    console.warn(`[${context}] 예상치 못한 경로, /files로 강제 보정: ${url}`);
    const fileName = url.split("/").pop()!;
    return `${API_BASE}/files/${encodeURIComponent(fileName)}`;
}
