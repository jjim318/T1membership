// src/lib/apiClient.ts
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    InternalAxiosRequestConfig,
} from "axios";

const BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// === 공통 ApiResult / 토큰 타입 ===
interface ApiResult<T> {
    isSuccess: boolean;
    resCode: number;
    resMessage: string;
    result: T;
}

interface TokenPayload {
    accessToken: string;
    refreshToken: string;
    memberEmail?: string;
}

// === axios 인스턴스 ===
export const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: false,
});

// === 요청 인터셉터: 항상 accessToken 실어서 보냄 ===
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("accessToken")
                : null;

        if (token) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error: unknown) => Promise.reject(error),
);

// === 401 처리용 상태 (동시 요청 큐) ===
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

        if (error) {
            reject(error);
        } else if (token) {
            const newConfig: AxiosRequestConfig = {
                ...config,
                headers: {
                    ...(config.headers ?? {}),
                    Authorization: `Bearer ${token}`,
                },
            };
            resolve(apiClient(newConfig));
        }
    }
}

// === refresh 토큰으로 accessToken 재발급 ===
async function refreshAccessToken(): Promise<string> {
    const accessToken =
        typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
    const refreshToken =
        typeof window !== "undefined"
            ? localStorage.getItem("refreshToken")
            : null;

    if (!accessToken || !refreshToken) {
        throw new Error("리프레시 토큰이 없습니다.");
    }

    // 🔥 서버는 ApiResult가 아니라 TokenRes 그대로 줌
    const res = await axios.post<TokenPayload>(
        `${BASE_URL}/auth/refresh`,
        {
            accessToken,
            refreshToken,
        },
    );

    const tokens = res.data; // ✅ result 말고 data 자체

    if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);
        if (tokens.memberEmail) {
            localStorage.setItem("memberEmail", tokens.memberEmail);
        }
        window.dispatchEvent(new Event("loginStateChange"));
    }

    apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;

    return tokens.accessToken;
}

// === 응답 인터셉터: 401 → refresh 시도 → 재요청 ===
apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        const err = error as AxiosError;

        const originalConfig = err.config as AxiosRequestConfig & {
            _retry?: boolean;
        };

        const status = err.response?.status ?? 0;
        const url = originalConfig.url ?? "";

        const isAuthUrl =
            url.includes("/auth/login") || url.includes("/auth/refresh");

        if (status === 401 && !originalConfig._retry && !isAuthUrl) {
            if (typeof window === "undefined") {
                return Promise.reject(error);
            }

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

                const newConfig: AxiosRequestConfig = {
                    ...originalConfig,
                    headers: {
                        ...(originalConfig.headers ?? {}),
                        Authorization: `Bearer ${newAccessToken}`,
                    },
                };

                return apiClient(newConfig);
            } catch (refreshError) {
                isRefreshing = false;
                processQueue(refreshError, null);

                if (typeof window !== "undefined") {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    window.dispatchEvent(new Event("loginStateChange"));
                    window.location.href = "/login";
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);
