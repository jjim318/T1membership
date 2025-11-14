package com.t1membership.order.domain;

import com.t1membership.member.domain.MemberEntity;
import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.order.constant.OrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "t1_order")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderEntity extends BaseEntity {

    @Id
    @Column(name = "order_no",nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderNo;

    //멤버id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_email", nullable = false)
    private MemberEntity member;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", nullable = false, length = 32)
    private OrderStatus orderStatus;

    // 배송/수령
    @Column(name = "receiver_name",  nullable = false, length = 50)
    private String receiverName;
    @Column(name = "receiver_phone", nullable = false, length = 20)
    private String receiverPhone;
    @Column(name = "receiver_address", nullable = false, length = 200)
    private String receiverAddress;
    @Column(name = "receiver_detail_address", length = 200)
    private String receiverDetailAddress;
    @Column(name = "receiver_zipcode", nullable = false, length = 10)
    private String receiverZipCode;
    @Column(name = "memo", length = 200)
    private String memo;

    // 주문 항목들
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItemEntity> orderItems = new ArrayList<>();

    // 주문에 orderItem 추가할 때 호출
    public void addItem(OrderItemEntity item) {
        item.setOrder(this);//orderItem 쪽에도 order연결(양방향)
        this.orderItems.add(item);//order > orderItem 리스트에 추가
        recalcTotal();//총 금액 다시 계산
    }
    public void recalcTotal() {
        this.orderTotalPrice = orderItems.stream()
                .mapToInt(OrderItemEntity::getLineTotal)
                .sum();// 모든 orderItem lineTotal합산
    }

    //전체금액결제
    @Column(name = "order_total_price",nullable = false)
    private long orderTotalPrice;
}
/* === GPT COMMENT START =====================================
파일 목적: 주문 헤더(공통) 엔티티. 한 번의 주문(결제 트랜잭션)을 대표하며, 배송지/주문상태/총액 등 "주문 공통 정보"를 담습니다.
핵심 개념:
- 헤더/라인 분리: OrderEntity(헤더) ↔ OrderItemEntity(라인, 여러 개). 장바구니·여러 상품 주문·부분 반품/환불을 위해 필수 구조.
- 양방향 연관관계: @OneToMany(mappedBy="order") / @ManyToOne(order). addItem() 편의 메서드로 양쪽 참조를 동기화하세요.
- 합계 계산: recalcTotal()에서 모든 라인의 lineTotal 합으로 orderTotalPrice를 계산(클라이언트 계산 금지).
- 상태 흐름: ORDERED → PAID → PROCESSING → SHIPPED → DELIVERED / (CANCELED, RETURNED, REFUNDED)
- t1.fan 스타일의 쇼핑 흐름을 가정할 때: 회원 주문 내역/상세/배송지 변경/취소 기능과 자연스럽게 연결됩니다.
권장 필드 체크리스트(부족 시 추가 권장):
- Long orderNo (PK, AUTO_INCREMENT)
- MemberEntity member (주문자)  // 현재 email FK 사용 시, 추후 member_id로 전환 권장
- OrderStatus orderStatus
- 배송지: receiverName/Phone/Address/DetailAddress/ZipCode/memo
- int orderTotalPrice  // recalcTotal()로 관리
- List<OrderItemEntity> orderItems  // cascade=ALL, orphanRemoval=true
편의 메서드:
- addItem(OrderItemEntity item): item.setOrder(this) + this.orderItems.add(item) + recalcTotal()
- recalcTotal(): this.orderTotalPrice = orderItems.stream().mapToInt(OrderItemEntity::getLineTotal).sum()
주의:
- 합계/상태/연관관계는 서비스 계층에서 일관되게 갱신.
- 결제/환불 이벤트에 맞춰 상태를 변경하고, 회계 데이터(스냅샷)는 라인 단위에서 보존하세요.

=== GPT COMMENT END ======================================= */
