package com.t1membership.order.dto.res.user;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRes {//주문생성결과
    private Long orderNo;//주문번호
    private String memberEmail;//회원아이디
    private LocalDateTime orderDate;//주문시간
    private OrderStatus orderStatus;//상태
    private BigDecimal orderTotalPrice;//총 금액
    private String checkoutUrl;        // 토스 결제창 URL

    public static CreateOrderRes from(OrderEntity orderEntity) {
        return CreateOrderRes.builder()
                .memberEmail(orderEntity.getMember().getMemberEmail())
                .orderNo(orderEntity.getOrderNo())
                .orderDate(orderEntity.getCreateDate())
                .orderStatus(orderEntity.getOrderStatus())
                .orderTotalPrice(orderEntity.getOrderTotalPrice())
                .build();
    }
    //신규 버전
    public static CreateOrderRes from(OrderEntity orderEntity, String checkoutUrl) {
        return CreateOrderRes.builder()
                .memberEmail(orderEntity.getMember().getMemberEmail())
                .orderNo(orderEntity.getOrderNo())
                .orderDate(orderEntity.getCreateDate())
                .orderStatus(orderEntity.getOrderStatus())
                .orderTotalPrice(orderEntity.getOrderTotalPrice())
                .checkoutUrl(checkoutUrl)
                .build();
    }
}
