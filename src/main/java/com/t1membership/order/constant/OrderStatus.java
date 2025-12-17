package com.t1membership.order.constant;

public enum OrderStatus {
    PAYMENT_PENDING,  // 결제대기(주문서만 생성)
    PAID,             // 결제완료(승인 성공)
    PAYMENT_FAILED,   // 결제실패(승인 실패)
    PAYMENT_EXPIRED,  // 결제만료(이탈/시간초과)

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
        // 결제대기는 그냥 포기/만료 처리에 가깝고,
        // PAID는 실제 결제취소(환불) 프로세스
        return this == PAYMENT_PENDING || this == PAID;
    }

    // 관리자는 좀 더 강하게
    public boolean isCancelableByAdmin() {
        return this == PAYMENT_PENDING   // 그냥 폐기
                || this == PAID           // 결제 취소
                || this == PROCESSING     // 출고 전 취소
                || this == SHIPMENT_READY
                || this == PARTIALLY_CANCELED;
    }

}
