package com.t1membership.order.dto.res.user;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.res.common.OrderItemRes;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailOrderRes {
    //주문내역상세(민감정보 제거)
    // ======================
    // 주문 기본 정보
    // ======================
    private Long orderNo;
    private OrderStatus orderStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private BigDecimal orderTotalPrice;

    // ======================
    // 결제 관련 (선택)
    // ======================
    private String paymentMethod;
    private String paymentStatus;

    // ======================
    // 배송 정보
    // ======================
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String receiverDetailAddress;
    private String receiverZipCode;
    private String memo;

    // ======================
    // 주문 상품들
    // ======================
    private List<OrderItemRes> items;

    // ======================
    // 🔥 멤버십 관련 정보 추가
    // ======================
    private String membershipPlanCode;          // 예: T1-2025-MONTHLY
    private String membershipPayType;           // ONE_TIME / YEARLY / RECURRING
    private Integer membershipMonths;           // 개월 수
    private LocalDateTime membershipStartDate;  // 이용 시작일
    private LocalDateTime membershipEndDate;    // 이용 종료일

    public static UserDetailOrderRes from(OrderEntity o) {

        // NPE 방지를 위해 방어적으로 items 매핑
        List<OrderItemRes> itemResList =
                (o.getOrderItems() == null)
                        ? Collections.emptyList()
                        : o.getOrderItems().stream()
                        .map(oi -> OrderItemRes.builder()
                                .itemNo(oi.getItem() != null ? oi.getItem().getItemNo() : null)
                                .itemNameSnapshot(oi.getItemNameSnapshot())
                                .itemOptionSnapshot(oi.getItemOptionSnapshot())
                                .itemImageSnapshot(oi.getItemImageSnapshot())
                                .priceAtOrder(oi.getPriceAtOrder())
                                .quantity(oi.getQuantity())
                                .lineTotal(oi.getLineTotal())
                                .build()
                        ).toList();

        return UserDetailOrderRes.builder()
                // ===== 기본 정보 =====
                .orderNo(o.getOrderNo())
                .orderStatus(o.getOrderStatus())
                .createdAt(o.getCreateDate())
                .updatedAt(o.getLatestDate())
                .orderTotalPrice(o.getOrderTotalPrice())

                // ===== 결제 정보 =====
//                .paymentMethod(o.getPaymentMethod())
//                .paymentStatus(o.getPaymentStatus())

                // ===== 배송 정보 =====
                .receiverName(o.getReceiverName())
                .receiverPhone(o.getReceiverPhone())
                .receiverAddress(o.getReceiverAddress())
                .receiverDetailAddress(o.getReceiverDetailAddress())
                .receiverZipCode(o.getReceiverZipCode())
                .memo(o.getMemo())

                // ===== 상품 리스트 =====
                .items(itemResList)

                // ===== 🔥 멤버십 정보 =====
                .membershipPlanCode(o.getMembershipPlanCode())
                .membershipPayType(
                        o.getMembershipPayType() != null
                                ? o.getMembershipPayType().name()
                                : null
                )
                .membershipMonths(o.getMembershipMonths())
                .membershipStartDate(o.getMembershipStartDate())
                .membershipEndDate(o.getMembershipEndDate())
                .build();
    }
}
