// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "8080",
                pathname: "/files/**", // http://localhost:8080/files/… 허용
            },
        ],
    },
};

export default nextConfig;
