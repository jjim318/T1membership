package com.t1membership.order.dto.res.user;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.res.common.OrderItemRes;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailOrderRes {
    //주문내역상세(민감정보 제거)
    // 주문 기본 정보
    private Long orderNo;
    private OrderStatus orderStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private BigDecimal orderTotalPrice;

    // 결제 관련 (선택)
    private String paymentMethod;
    private String paymentStatus;

    // 배송 정보
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String receiverDetailAddress;
    private String receiverZipCode;
    private String memo;

    // 주문 상품들
    private List<OrderItemRes> items;

    public static UserDetailOrderRes from(OrderEntity o) {
        return UserDetailOrderRes.builder()
                .orderNo(o.getOrderNo())
                .orderStatus(o.getOrderStatus())
                .createdAt(o.getCreateDate())
                .updatedAt(o.getLatestDate())
                .orderTotalPrice(o.getOrderTotalPrice())
                .receiverName(o.getReceiverName())
                .receiverPhone(o.getReceiverPhone())
                .receiverAddress(o.getReceiverAddress())
                .receiverDetailAddress(o.getReceiverDetailAddress())
                .receiverZipCode(o.getReceiverZipCode())
                .memo(o.getMemo())
                .items(
                        o.getOrderItems().stream().map(oi -> OrderItemRes.builder()
                                .itemNo(oi.getItem().getItemNo())
                                .itemNameSnapshot(oi.getItemNameSnapshot())
                                .itemOptionSnapshot(oi.getItemOptionSnapshot())
                                .itemImageSnapshot(oi.getItemImageSnapshot())
                                .priceAtOrder(oi.getPriceAtOrder())
                                .quantity(oi.getQuantity())
                                .lineTotal(oi.getLineTotal())
                                .build()
                        ).toList()
                )
                .build();
    }
}
