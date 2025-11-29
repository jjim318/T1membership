package com.t1membership.item.constant;

public enum MembershipPayType {
    ONE_TIME,   // 단건 결제 (기간형 한 번)
    YEARLY,     // 연간권 결제
    RECURRING,  // 정기결제 (매월 자동 결제)
    NO_MEMBERSHIP
}
