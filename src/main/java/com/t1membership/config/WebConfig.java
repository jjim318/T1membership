package com.t1membership.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // application.properties 에서 끌어오는 값들
    @Value("${app.upload.dir}")
    private String uploadDir;        // C:/upload

    @Value("${app.upload.url-base}")
    private String uploadUrlBase;    // /files

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        // 윈도우 경로 슬래시 정리
        String cleanedPath = uploadDir.replace("\\", "/");
        if (!cleanedPath.endsWith("/")) {
            cleanedPath = cleanedPath + "/";
        }

        // 🔥 http://localhost:8080/files/**  →  C:/upload/**
        registry.addResourceHandler(uploadUrlBase + "/**")
                .addResourceLocations("file:" + cleanedPath);
        // 예) addResourceLocations("file:C:/upload/");
    }
}
