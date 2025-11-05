package com.t1membership.exception;

import com.t1membership.ApiError;
import com.t1membership.member.service.MemberService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Builder;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
@Log4j2
public class GlobalExceptionHandler {

    @ExceptionHandler(MemberService.MemberIdExistException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleMemberIdExist(MemberService.MemberIdExistException ex,
                                        HttpServletRequest req) {
        log.warn("[MemberIdExist] {}", ex.getMessage());
        return ApiError.builder()
                .isSuccess(false)
                .resCode("MEMBER_ID_DUPLICATED")
                .message(ex.getMessage())
                .path(req.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiError handleAllExceptions(Exception e, HttpServletRequest req) {
        return ApiError.builder()
                .isSuccess(false)
                .resCode("INTERNAL_ERROR")
                .message(e.getMessage())
                .path(req.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();
    }
}
