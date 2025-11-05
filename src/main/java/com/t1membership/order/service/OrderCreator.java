package com.t1membership.order.service;

import com.t1membership.order.dto.res.user.CreateOrderRes;

public interface OrderCreator<P> {
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리
    CreateOrderRes create(String memberEmail, P payload);
    String typekey();// "GOODS" / "MEMBERSHIP" / "POP"
}
