package com.t1membership.order.dto.req.admin;

import com.t1membership.order.constant.OrderStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSearchOrderReq {
    //관리자 주문 검색 필터(기간,결제 타입, 상태 등)
    private String memberEmail;//회원아이디
    private LocalDateTime orderFrom;//주문시간(기간 시작)
    private LocalDateTime orderTo;//주문시간(기간 종료)
    private String keyword;// 주문명 등
    private OrderStatus orderStatus;//주문상태
}
