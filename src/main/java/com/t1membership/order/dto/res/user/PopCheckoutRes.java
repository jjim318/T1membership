// src/main/java/com/t1membership/order/dto/res/user/PopCheckoutRes.java
package com.t1membership.order.dto.res.user;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PopCheckoutRes {

    private String buyerName;
    private String buyerEmail;
    private List<PopCheckoutItemRes> items;
    private int totalAmount;
}
