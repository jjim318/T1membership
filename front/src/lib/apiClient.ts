// src/lib/apiClient.ts

import axios from "axios";

// 백엔드 스프링 서버 주소
const BASE_URL = "http://localhost:8080";

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});
