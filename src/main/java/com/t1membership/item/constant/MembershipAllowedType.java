package com.t1membership.item.constant;

public enum MembershipAllowedType {
    ONE_TIME_ONLY,              // 단건만 가능
    YEARLY_ONLY,                // 연간권만 가능
    RECURRING_ONLY,             // 정기결제만 가능
    ONE_TIME_OR_RECURRING,      // 단건 또는 정기 둘 다 가능
    MEMBERSHIP_NOT_REQUIRED;

    public boolean allows(MembershipPayType payType) {
        return switch (this) {
            case ONE_TIME_ONLY -> payType == MembershipPayType.ONE_TIME;
            case YEARLY_ONLY   -> payType == MembershipPayType.YEARLY;
            case RECURRING_ONLY -> payType == MembershipPayType.RECURRING;
            case ONE_TIME_OR_RECURRING ->
                    payType == MembershipPayType.ONE_TIME || payType == MembershipPayType.RECURRING;
            case MEMBERSHIP_NOT_REQUIRED -> payType == MembershipPayType.NO_MEMBERSHIP;
        };
    }

}
