package com.t1membership.item.domain;

import com.t1membership.coreDomain.BaseEntity;
import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.constant.MembershipAllowedType;
import com.t1membership.item.constant.MembershipPayType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Table(name = "t1_item")
public class ItemEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_no", nullable = false)
    private Long itemNo;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "item_price", nullable = false)
    private int itemPrice;

    @Column(name = "item_stock", nullable = false)
    private int itemStock;

    @Column(name = "item_category")
    @Enumerated(EnumType.STRING)
    private ItemCategory itemCategory;

    @Column(name = "item_sell_status")
    @Enumerated(EnumType.STRING)
    private ItemSellStatus itemSellStatus;

    // ===========================
    // 🔽 멤버십 전용 필드들 (MEMBERSHIP일 때만 의미 있음)
    // ===========================

    // 이 멤버십 기본 결제 타입 (화면 기본 선택값 용도)
    @Column(name = "membership_pay_type")
    @Enumerated(EnumType.STRING)
    private MembershipPayType membershipPayType;

    // 어떤 결제 방식 조합을 허용할지
    @Column(name = "membership_allowed_type")
    @Enumerated(EnumType.STRING)
    private MembershipAllowedType membershipAllowedType;

    // 정기결제 금액 (월)
    @Column(name = "membership_monthly_price")
    private Integer membershipMonthlyPrice;

    // 연간 일시 결제 금액
    @Column(name = "membership_yearly_price")
    private Integer membershipYearlyPrice;

    // 기간형 단건 결제 금액 (예: 30일권 같은 거)
    @Column(name = "membership_one_time_price")
    private Integer membershipOneTimePrice;

    // 단건 결제 시 기본 제공 개월 수 (예: 1개월권, 3개월권)
    @Column(name = "membership_one_time_months")
    private Integer membershipOneTimeMonths;

    // 설명 정도 하나 있으면 프론트에서 쓰기 좋음
    @Column(name = "membership_description", length = 1000)
    private String membershipDescription;

    // 활성 여부 (판매 중 / 내림)
    @Column(name = "membership_active")
    private Boolean membershipActive;

}
