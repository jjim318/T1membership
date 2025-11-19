package com.t1membership.order.dto.res.admin;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.res.common.OrderItemRes;
import com.t1membership.pay.constant.TossPaymentStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDetailOrderRes {
    //주문상세(개인정보원본,결제,물류 등)

    private String memberEmail;//주문자
    private Long orderNo; //주문번호
    private OrderStatus orderStatus;//주문상태
    private LocalDateTime createdAt;//주문 시간
    private LocalDateTime updatedAt;//주문 변경시간
    private TossPaymentStatus tossPaymentStatus;//결제상태

    // 배송 정보
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String receiverDetailAddress;
    private String receiverZipCode;
    private String memo;

    // 주문 상품들
    private List<OrderItemRes> items;


    public static AdminDetailOrderRes from(OrderEntity orderEntity) {
        return AdminDetailOrderRes.builder()
                .orderNo(orderEntity.getOrderNo())
                .memberEmail(orderEntity.getMember().getMemberEmail())
                .orderStatus(orderEntity.getOrderStatus())
                .createdAt(orderEntity.getCreateDate())
                .updatedAt(orderEntity.getLatestDate())
                // tossPaymentStatus 는 결제 엔티티에서 끌어와야 하면 나중에 추가
                .receiverName(orderEntity.getReceiverName())
                .receiverPhone(orderEntity.getReceiverPhone())
                .receiverAddress(orderEntity.getReceiverAddress())
                .receiverDetailAddress(orderEntity.getReceiverDetailAddress())
                .receiverZipCode(orderEntity.getReceiverZipCode())
                .memo(orderEntity.getMemo())
                .items(
                        orderEntity.getOrderItems().stream()
                                .map(oi -> OrderItemRes.builder()
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
/* === GPT COMMENT START =====================================
파일 목적: 관리자 화면용 주문 상세 응답 DTO.
- 사용자 상세(UserDetailOrderRes)보다 더 많은 내부 정보를 포함(로그/상태 전이/메모 등).
=== GPT COMMENT END ======================================= */