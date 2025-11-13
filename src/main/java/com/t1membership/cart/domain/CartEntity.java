package com.t1membership.cart.domain;

import com.t1membership.item.domain.ItemEntity;
import com.t1membership.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Table(
        name = "t1_cart",
        uniqueConstraints = @UniqueConstraint(
                name = "ux_cart_member_item",
                columnNames = {"member_email", "item_no"}
        ),
        indexes = {
                @Index(name = "idx_cart_member", columnList = "member_email"),
                @Index(name = "idx_cart_item", columnList = "item_no")
        }
)
public class CartEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cart_no", nullable = false)
    private Long cartNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_email", nullable = false)
    private MemberEntity member; // member

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_no", nullable = false)
    private ItemEntity item;

    @Column(name = "item_quantity", nullable = false)
    @Builder.Default
    private int itemQuantity = 1;

}
