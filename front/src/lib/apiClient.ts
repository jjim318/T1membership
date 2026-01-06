// src/lib/apiClient.ts
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    InternalAxiosRequestConfig,
} from "axios";

const BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://192.168.219.185:8080"; // ✅ fallback도 서버로

interface TokenPayload {
    accessToken: string;
    refreshToken: string;
    memberEmail?: string;
}

export const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: false,
});

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window === "undefined") return config;

        // ✅ 다양한 경우 커버
        let token =
            localStorage.getItem("accessToken") ||
            sessionStorage.getItem("accessToken") ||
            localStorage.getItem("Authorization") ||
            sessionStorage.getItem("Authorization");

        if (token) {
            token = token.trim();

            // ✅ "Bearer xxx" 형태로 저장돼있으면 중복 방지
            const value = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

            config.headers = config.headers ?? {};
            config.headers.Authorization = value;
        }

        return config;
    },
    (error: unknown) => Promise.reject(error),
);

// ===== 401 refresh 처리 =====
let isRefreshing = false;

interface FailedRequest {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    config: AxiosRequestConfig;
}
const failedQueue: FailedRequest[] = [];

function processQueue(error: unknown | null, token: string | null) {
    while (failedQueue.length > 0) {
        const { resolve, reject, config } = failedQueue.shift() as FailedRequest;
        if (error) reject(error);
        else if (token) {
            resolve(
                apiClient({
                    ...config,
                    headers: { ...(config.headers ?? {}), Authorization: `Bearer ${token}` },
                }),
            );
        }
    }
}

async function refreshAccessToken(): Promise<string> {
    const accessToken =
        localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    const refreshToken =
        localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    if (!accessToken || !refreshToken) throw new Error("리프레시 토큰이 없습니다.");

    const res = await axios.post<TokenPayload>(`${BASE_URL}/auth/refresh`, {
        accessToken,
        refreshToken,
    });

    const tokens = res.data;

    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    if (tokens.memberEmail) localStorage.setItem("memberEmail", tokens.memberEmail);
    window.dispatchEvent(new Event("loginStateChange"));

    apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
    return tokens.accessToken;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        const err = error as AxiosError;

        const originalConfig = err.config as AxiosRequestConfig & { _retry?: boolean };
        const status = err.response?.status ?? 0;
        const url = originalConfig.url ?? "";

        const isAuthUrl = url.includes("/auth/login") || url.includes("/auth/refresh");

        if (status === 401 && !originalConfig._retry && !isAuthUrl) {
            if (typeof window === "undefined") return Promise.reject(error);

            originalConfig._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, config: originalConfig });
                });
            }

            isRefreshing = true;

            try {
                const newAccessToken = await refreshAccessToken();
                isRefreshing = false;
                processQueue(null, newAccessToken);

                return apiClient({
                    ...originalConfig,
                    headers: {
                        ...(originalConfig.headers ?? {}),
                        Authorization: `Bearer ${newAccessToken}`,
                    },
                });
            } catch (refreshError) {
                isRefreshing = false;
                processQueue(refreshError, null);

                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.dispatchEvent(new Event("loginStateChange"));
                window.location.href = "/login";

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);
