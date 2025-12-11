package com.t1membership.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir}")
    private String uploadDir;        // C:/upload

    @Value("${app.upload.url-base}")
    private String uploadUrlBase;    // /files


    // ==============================
    // 1) CORS 설정 (이미지 불러오기에도 필요!!)
    // ==============================
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:3000",
                        "http://127.0.0.1:3000"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }


    // ==============================
    // 2) 정적 파일 매핑 (/files/** → uploadDir)
    // ==============================
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        // 경로 정규화
        String cleanedDir = uploadDir.replace("\\", "/");
        if (!cleanedDir.endsWith("/")) cleanedDir += "/";

        // url-base 정규화
        String cleanedBase = uploadUrlBase;
        if (!cleanedBase.startsWith("/")) cleanedBase = "/" + cleanedBase;
        if (cleanedBase.endsWith("/")) cleanedBase = cleanedBase.substring(0, cleanedBase.length() - 1);

        // 최종 매핑: /files/** → C:/upload/**
        registry.addResourceHandler(cleanedBase + "/**")
                .addResourceLocations("file:" + cleanedDir);
    }
}
