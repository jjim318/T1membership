// src/main/java/com/t1membership/order/dto/res/user/PopCheckoutItemRes.java
package com.t1membership.order.dto.res.user;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PopCheckoutItemRes {

    private Long itemNo;
    private String imageUrl;     // 썸네일 URL
    private String title;        // 상품명
    private String subtitle;     // 필요 없으면 null
    private String description;  // 필요 없으면 null
    private int price;           // 이 이용권의 총 금액
    private int quantity;        // 인원 수(qty)
}
