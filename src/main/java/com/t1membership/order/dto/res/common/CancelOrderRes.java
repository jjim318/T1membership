package com.t1membership.order.dto.res.common;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelOrderRes {
    private Long orderNo;             // 주문 번호
    private OrderStatus orderStatus;  // 최종 상태 (CANCELLED 등)

    private BigDecimal cancelAmount;         // 취소/환불 금액
    private String cancelReason;      // 취소 사유

    private String paymentKey;        // 토스 결제 고유키 (있으면)
    private String tossStatus;        // 토스에서 내려준 최종 상태 (예: CANCELED)
    private String tossMessage;       // 에러/결과 메시지 요약 (필요시)

    private LocalDateTime canceledAt; // 우리가 기록하는 취소 시각

}
