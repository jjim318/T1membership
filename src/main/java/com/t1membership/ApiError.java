package com.t1membership;


import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonPropertyOrder({ "isSuccess", "resCode", "resMessage" })
@Builder
public class ApiError {

    @JsonProperty("isSuccess")
    private boolean isSuccess = false;

    private String resCode;

    private String resMessage;

    private String message;

    private String path;

    private LocalDateTime timestamp;

    public ApiError(String resCode, String resMessage) {
        this.resCode = resCode;
        this.resMessage = resMessage;
    }
}
