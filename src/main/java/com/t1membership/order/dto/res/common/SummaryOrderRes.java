package com.t1membership.order.dto.res.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SummaryOrderRes {
    //목록 한 줄 요약(주문번호,회원,상태,총액)
    private Long orderNo;//주문번호
    private String memberEmail;//주문회원
    private LocalDateTime orderDate;//주문시각
    private BigDecimal orderTotalPrice;//총 결제 금액(KRW)
    private OrderStatus orderStatus;//주문 상태
    private Integer itemCount;//상품개수
    private String itemName;//상품이름

    public static SummaryOrderRes from(OrderEntity order) {

        String itemName = null;
        int itemCount = 0;

        // 1) 일반 상품 주문 (orderItems 존재)
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            OrderItemEntity first = order.getOrderItems().get(0);
            itemName = first.getItemNameSnapshot();
            itemCount = order.getOrderItems().size();
        }
        // 2) 멤버십 전용 주문 (orderItems 비어있고 membership_plan_code 존재)
        else if (order.getMembershipPlanCode() != null) {
            itemName = toMembershipDisplayName(order.getMembershipPlanCode());
            itemCount = 1;   // 화면용으로 1개 고정
        }
        // 3) 그 외(예외적인 경우)
        else {
            itemName = "상품명 정보 없음";
            itemCount = 0;
        }

        return SummaryOrderRes.builder()
                .orderNo(order.getOrderNo())
                .memberEmail(order.getMember().getMemberEmail())
                .orderDate(order.getCreateDate())
                .orderStatus(order.getOrderStatus())
                .orderTotalPrice(order.getOrderTotalPrice())
                .itemCount(itemCount)
                .itemName(itemName)
                .build();
    }

    /**
     * membership_plan_code → 화면에 보여줄 멤버십 이름으로 변환
     * 필요하면 코드/이름은 언제든지 여기서만 수정하면 됩니다.
     */
    private static String toMembershipDisplayName(String planCode) {

        if (planCode == null) {
            return "멤버십 상품";
        }

        // 예시: 형님 DB 기준
        switch (planCode) {
            case "T1-2025-MONTHLY":
                return "2025 T1 멤버십 (월간)";
            case "T1-2025-YEARLY":
                return "2025 T1 멤버십 (연간)";
            // 추후 다른 플랜 코드 추가
            default:
                return "멤버십 상품";
        }
    }
}
