package com.t1membership.order.service;

import com.t1membership.item.domain.ItemEntity;
import com.t1membership.item.repository.ItemRepository;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class MembershipOrderCreator implements OrderCreator<CreateMembershipOrderReq> {
    private final MemberRepository memberRepository;
    private final ItemRepository itemRepository;
    //멤버쉽 생성 세부 구현체
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리

    @Override
    public OrderEntity create(String memberEmail, CreateMembershipOrderReq req) {

        // 0) 기본 검증
        if (req.getMonths() == null || req.getMonths() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이용 개월 수가 올바르지 않습니다.");
        }

        //회원 조회
        MemberEntity memberEntity = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND,"회원이 존재하지 않습니다"));

        //멤버쉽 상품 조회
//        ItemEntity membershipItem = itemRepository.findByPlanCode(req.getPlanCode())
//                .orElseThrow(() -> new ResponseStatusException(
//                        HttpStatus.BAD_REQUEST, "존재하지 않는 멤버십 상품입니다."));

        //결제 금액 계산
        long unitPrice = membershipItem.getItemPrice();
        long totalAmount;

        if (req.isAutoRenew()){
            //정기/연간 결제
            totalAmount = unitPrice + membershipItem.getItemPrice();
        }else {
            //단건결제
            totalAmount = unitPrice;
        }

        //주문 엔티티 생성(헤더
        OrderEntity orderEntity = new OrderEntity();
        orderEntity.setMember(memberEntity);
        orderEntity.setOrderStatus(OrderStatus.PAID);
        orderEntity.setOrderTotalPrice(totalAmount);

        // 주문 타입 구분 필드가 있으면 여기서 MEMBERSHIP 등으로 세팅
        // order.setOrderType(OrderType.MEMBERSHIP);

        // 멤버십 관련 스냅샷(이름/생일/전화 등)을 Order에 남기고 싶으면 여기서
        // order.setMembershipName(req.getMemberName());
        // order.setMembershipBirth(req.getMemberBirth());
        // order.setMembershipPhone(req.getMemberPhone());

        //주문 아이템 스냅샷 생성 (멤버쉽은 1개로 고정
        OrderItemEntity orderItemEntity = new OrderItemEntity();
        orderItemEntity.setOrder(orderEntity);                 // 연관관계
        orderItemEntity.setItem(membershipItem);         // 원본 Item 연관관계 있으면
        orderItemEntity.setOrderItemNo(membershipItem.getId());
        orderItemEntity.setItemNameSnapshot(membershipItem.getName());   // 스냅샷
        orderItemEntity.setItemPriceSnapshot(unitPrice);                  // 단가 스냅샷
        orderItemEntity.setQuantity(1);

        // 필요하면 payType 느낌으로도 스냅샷 남겨도 됨
        // orderItem.setPayType(req.isAutoRenew() ? "RECURRING" : "ONE_TIME");

        //order에 아이템 추가
        orderEntity.getOrderItems().add(orderItemEntity);
        return orderEntity;
    }
}
