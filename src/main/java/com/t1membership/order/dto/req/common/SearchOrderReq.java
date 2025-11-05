package com.t1membership.order.dto.req.common;

import com.t1membership.order.constant.OrderStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchOrderReq {//주문 검색(공용
    private Long orderNo;//주문번호
    private LocalDateTime orderFrom;//주문시간(기간 시작)
    private LocalDateTime orderTo;//주문시간(기간 종료)
    private String keyword;// 주문명 등
    private OrderStatus orderStatus;//주문상태
}
