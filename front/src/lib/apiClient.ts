// src/lib/apiClient.ts
import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export const apiClient = axios.create({
    baseURL: "http://192.168.0.180:8080", // 백엔드 주소
    withCredentials: false,
});

// 요청 config 에 _retry 플래그를 달기 위한 확장 타입
type RetryAxiosRequestConfig = AxiosRequestConfig & {
    _retry?: boolean;
};

// ======================
//  요청 인터셉터: JWT 첨부
// ======================
apiClient.interceptors.request.use(
    (config) => {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("accessToken")
                : null;

        if (token) {
            config.headers = config.headers ?? {};
            // headers는 인덱스 접근이 안전함
            (config.headers as any).Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error),
);

// ======================================
//  리프레시 토큰으로 Access 재발급 함수
// ======================================
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        if (typeof window === "undefined") return null;

        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
            return null;
        }

        try {
            // 🔥 리프레시 요청은 apiClient 말고 axios 기본 인스턴스로 (인터셉터 꼬임 방지)
            const res = await axios.post("http://192.168.0.180:8080/auth/refresh", {
                accessToken,
                refreshToken,
            });

            const data = res.data?.result ?? res.data;
            const newAccess: string = data.accessToken;
            const newRefresh: string = data.refreshToken;

            localStorage.setItem("accessToken", newAccess);
            localStorage.setItem("refreshToken", newRefresh);
            window.dispatchEvent(new Event("loginStateChange"));

            return newAccess;
        } catch (e) {
            console.error("[refreshAccessToken] 실패", e);
            // 리프레시도 실패 → 완전 로그아웃 처리
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.dispatchEvent(new Event("loginStateChange"));
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// ======================
//  응답 인터셉터: 401 → refresh
// ======================
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        // AxiosError 가 아니거나 response 가 없으면 그대로 던짐
        if (!error || !error.response) {
            return Promise.reject(error);
        }

        const status = error.response.status;

        // 🔥 config 를 우리가 확장한 타입으로 캐스팅
        const originalConfig = (error.config || {}) as RetryAxiosRequestConfig;

        // 이미 한 번 재시도한 요청이면 더 이상 안 함
        if (originalConfig._retry) {
            return Promise.reject(error);
        }

        // 401 + /auth/xxx 요청이 아니면 → 리프레시 시도
        if (
            status === 401 &&
            typeof window !== "undefined" &&
            originalConfig.url &&
            !originalConfig.url.includes("/auth/login") &&
            !originalConfig.url.includes("/auth/refresh") &&
            !originalConfig.url.includes("/auth/logout")
        ) {
            originalConfig._retry = true;

            const newAccess = await refreshAccessToken();
            if (newAccess) {
                originalConfig.headers = originalConfig.headers ?? {};
                // headers 객체에 Authorization 세팅 (인덱스 접근)
                (originalConfig.headers as any).Authorization = `Bearer ${newAccess}`;
                return apiClient(originalConfig);
            }
        }

        return Promise.reject(error);
    },
);
