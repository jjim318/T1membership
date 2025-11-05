package com.t1membership.order.dto.res.admin;

import com.t1membership.order.constant.OrderStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
//@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogOrderRes {
    //주문이력(누가언제무엇을) 상태변경 로그,메모등
    //관리자가 보는 주문이력
    private Long orderNo; //주문번호
    private OrderStatus orderStatus; //주문상태
    private LocalDateTime createdAt; //주문시간
    private int orderTotalPrice; //주문 총 금액
}
/* === GPT COMMENT START =====================================
파일 목적: 주문 상태 변경/검수 이력 응답 DTO(관리자용).
- 누가 언제 무엇을 변경했는지(관리자ID/사유/이전→이후 상태).
=== GPT COMMENT END ======================================= */