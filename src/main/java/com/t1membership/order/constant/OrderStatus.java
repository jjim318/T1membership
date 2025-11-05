package com.t1membership.order.constant;

public enum OrderStatus {
    ORDERED,        // 주문 생성됨
    PAID,           // 결제 완료
    PROCESSING,     // 상품 준비 중
    SHIPMENT_READY, // 배송 준비
    SHIPPED,        // 배송 중
    DELIVERED,      // 배송 완료
    CANCELED,       // 주문 취소
    RETURNED,       // 반품됨
    REFUNDED;       // 환불 완료
}
