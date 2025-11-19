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
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            OrderItemEntity first = order.getOrderItems().get(0);
            itemName = first.getItemNameSnapshot();
        }

        return SummaryOrderRes.builder()
                .orderNo(order.getOrderNo())
                .memberEmail(order.getMember().getMemberEmail())
                .orderDate(order.getCreateDate())
                .orderStatus(order.getOrderStatus())
                .orderTotalPrice(order.getOrderTotalPrice())
                .itemCount(order.getOrderItems() != null ? order.getOrderItems().size() : 0)
                .itemName(itemName)
                .build();
    }
}
