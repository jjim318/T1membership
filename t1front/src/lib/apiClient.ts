// src/lib/apiClient.ts
import axios from "axios";

export const apiClient = axios.create({
    baseURL: "http://localhost:8080", // 형님 백엔드 주소
    withCredentials: false,
});

apiClient.interceptors.request.use(
    (config) => {
        // ✅ 로컬스토리지에서 accessToken 꺼내기
        const token = typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;

        console.log("요청 전 토큰 raw =", token);

        if (token) {
            config.headers = config.headers ?? {};
            // ✅ 반드시 "Bearer " + 토큰 (사이에 공백 있어야 함)
            config.headers.Authorization = `Bearer ${token}`;
            console.log("요청 헤더 Authorization =", config.headers.Authorization);
        } else {
            console.log("요청 전 헤더 Authorization 추가 안함 (토큰 없음)");
        }

        return config;
    },
    (error) => Promise.reject(error)
);
