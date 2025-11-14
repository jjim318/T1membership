package com.t1membership.order.service;

import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.user.CreatePopOrderReq;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class PopOrderCreator implements OrderCreator<CreatePopOrderReq> {
    private final MemberRepository memberRepository;
    //채팅주문 세부 구현체
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리

    @Override
    public OrderEntity create(String membberEmail, CreatePopOrderReq req) {

        //회원조회
        MemberEntity memberEntity = memberRepository.findByMemberEmail(membberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 젇보가 없습니다"));

        //pop상품 조회
        PopItemEntity popItem = popItemRepository.findById(req.getPopItemId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "존재하지 않는 POP 상품"));

        //접근권 검증
        validatePopEligibility(memberEntity, popItem);

        //금액 계산
        int price = popItem.getPrice();

        //주문 헤더 생성
        OrderEntity orderEntity = new OrderEntity();
        orderEntity.setMember(memberEntity);
        orderEntity.setOrderStatus(OrderStatus.PAID);
        orderEntity.setOrderTotalPrice(price);
        // order.setOrderType(OrderType.POP);  // 주문 타입이 있을 경우

        //주문 아이템 스냅샷 생성
        OrderItemEntity item = new OrderItemEntity();
        item.setOrder(orderEntity);
        item.setItemId(popItem.getId());
        item.setItemNameSnapshot(popItem.getTitle()); // 선수 이름 + POP명 등
        item.setItemPriceSnapshot(price);
        item.setQuantity(1);

        order.getOrderItems().add(item);

        return orderEntity;
    }

    //이미 구매한 팬인지 검증
    private void validatePopEligibility(MemberEntity member, PopItemEntity popItem) {
        // 예 1) 이미 접근권을 가진 경우 -> 중복 구매 불가 처리
        // if (popMembershipRepository.existsByMemberAndPopItem(member, popItem)) {
        //     throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 POP 접근권이 있습니다.");
        // }

        // 예 2) 선수의 POP가 현재 판매 중인지
        // if (!popItem.isOnSale()) {
        //     throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 구매할 수 없는 POP입니다.");
        // }
    }
}
