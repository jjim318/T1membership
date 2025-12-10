package com.t1membership.order.constant;

public enum OrderStatus {
    ORDERED,        // 주문 생성됨
    PAID,           // 결제 완료
    PROCESSING,     // 상품 준비 중
    SHIPMENT_READY, // 배송 준비
    SHIPPED,        // 배송 중
    DELIVERED,      // 배송 완료
    CANCELED,       // 주문 취소
    PARTIALLY_CANCELED, // 일부 상품만 취소(나머지는 유지)
    RETURNED,       // 반품됨
    REFUNDED;       // 환불 완료

    // 회원이 직접 취소 가능한 상태만 허용
    public boolean isCancelableByUser() {
        return this == ORDERED
                || this == PAID;
    }

    // 관리자는 좀 더 강하게
    public boolean isCancelableByAdmin() {
        return this == ORDERED
                || this == PAID
                || this == PARTIALLY_CANCELED
                || this == DELIVERED;
    }

}
