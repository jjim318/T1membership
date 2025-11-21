package com.t1membership;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@JsonPropertyOrder({ "isSuccess", "resCode", "resMessage" })
@Builder
@AllArgsConstructor   // 모든 필드를 받는 생성자 자동 생성
@NoArgsConstructor    // 기본 생성자도 하나 만들어 둠
public class ApiError {

    @JsonProperty("isSuccess")
    @Builder.Default          // 빌더 사용할 때도 기본값 false 유지
    private boolean isSuccess = false;

    private String resCode;

    private String resMessage;

    private String message;

    private String path;

    private LocalDateTime timestamp;

    // ★ 직접 만든 2개짜리 생성자는 삭제했습니다.
}
