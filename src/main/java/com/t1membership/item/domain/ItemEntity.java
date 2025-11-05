package com.t1membership.item.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Table(name = "t1_item")
public class ItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_no", nullable = false)
    private Long ino;

    @Column(name = "item_name", nullable = false)
    private String iName;

    @Column(name = "item_price", nullable = false)
    private int iPrice;

    @Column(name = "item_stock", nullable = false)
    private int iStock;
}
