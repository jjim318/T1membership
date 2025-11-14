package com.t1membership.order.domain;

import com.t1membership.item.domain.ItemEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "t1_order_item")
@Getter
@Setter
public class OrderItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_no")
    private Long orderItemNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_no", nullable = false)
    private OrderEntity order;

    // 어떤 상품을 샀는지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_no", nullable = false)
    private ItemEntity item;

    // 주문 시점 스냅샷 + 수량
    @Column(name = "item_name_snapshot", length = 200)
    private String itemNameSnapshot;

    @Column(name = "item_option_snapshot", length = 200)
    private String itemOptionSnapshot; //굿즈 선수,옷 사이즈 등

    @Column(name = "item_image_snapshot", length = 500)
    private String itemImageSnapshot;

    @Column(name = "item_price_snapshot")
    private int itemPriceSnapshot;

    @Column(name = "price_at_order", nullable = false)
    private int priceAtOrder;              // 당시 단가

    @Column(name = "quantity", nullable = false)
    private int quantity;                  // 주문 수량

    @Column(name = "line_total", nullable = false)
    private int lineTotal;                 // 단가 * 수량

    // 팩토리/계산 보조
    public static OrderItemEntity of(ItemEntity item, int quantity) {
        OrderItemEntity oi = new OrderItemEntity();
        oi.setItem(item);
        oi.setQuantity(quantity);
        oi.setPriceAtOrder(item.getItemPrice());
        oi.setItemNameSnapshot(item.getItemName());
        //oi.setItemImageSnapshot(item.getIImage());
        oi.setLineTotal(oi.getPriceAtOrder() * oi.getQuantity());
        return oi;
    }
}
/* === GPT COMMENT START =====================================
파일 목적: 주문 라인(각 상품 1줄) 엔티티. 어떤 상품을 몇 개 샀는지, 주문 시점 스냅샷과 함께 보관합니다.
핵심 개념(스냅샷):
- priceAtOrder / itemNameSnapshot / itemImageSnapshot / (선택) itemOptionSnapshot 은 주문 당시 값을 고정 저장합니다.
  상품의 현재값(ItemEntity)이 변경돼도 과거 주문 영수증은 바뀌지 않아야 합니다.
권장 필드 체크리스트:
- Long id (PK)
- OrderEntity order (다대일, FK: order_no)
- ItemEntity item (다대일, FK: item_id)  // 이름 FK는 변경 위험 → PK 권장
- int quantity  // 주문 수량(재고가 아님)
- int priceAtOrder  // 주문 당시 단가(스냅샷)
- String itemNameSnapshot, String itemImageSnapshot, (선택) String itemOptionSnapshot
- int lineTotal = priceAtOrder * quantity
팩토리 메서드:
- of(ItemEntity item, int quantity): 스냅샷/계산 세팅. (order 연결은 OrderEntity.addItem()에서 수행 권장)
동시성/재고:
- 재고는 ItemEntity.stock에서만 관리. 주문 확정 시 재고 차감(+ 실패 시 롤백) 하며, 낙관적/비관적 락을 검토하세요.

=== GPT COMMENT END ======================================= */