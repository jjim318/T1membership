package com.t1membership.order.service;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.dto.res.user.CreateOrderRes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sound.sampled.Line;
import java.util.List;

@Component
@RequiredArgsConstructor
public class GoodsOrderCreator implements OrderCreator<CreateGoodsOrderReq> {
    //주문 한 건을 생성해서 결제 준비값을 돌려줌
    //생성만 여기서 코드를 만듦(서비스 계층의 세부 구현체
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리


    @Transactional
    public CreateOrderRes create(String memberEmail, CreateGoodsOrderReq p) {
        List<Line> lines = (isCart(p))
                ? buildFromCart(memberId, p.getCartItemIds())   // 장바구니 선택
                : buildFromSingle(p.getItemId(), p.getQuantity());

        // 가격/합계
        int itemsSubtotal = lines.stream().mapToInt(Line::lineTotal).sum();
        int shippingFee   = shippingFeePolicy.compute(itemsSubtotal, p /*주소/우편번호 필요시*/);
        int totalAmount   = itemsSubtotal + shippingFee;

        // 헤더 저장(PENDING)
        OrderEntity orders = OrderEntity.builder()
                .member(memberEmail)
                .orderType(ItemCategory.MD)
                .status(OrderStatus.PAID)
                .itemsSubtotal(itemsSubtotal)
                .shippingFee(shippingFee)
                .totalAmount(totalAmount)
                .build();

        // 라인 스냅샷 저장
        for (Line l : lines) orders.addItem(toSnapshot(l));

        orderRepository.save(orders);

        // 재고 hold(선점 정책이면)
        inventoryService.hold(lines, orders.getId());

        // 주문명
        String orderName = orderNameBuilder.forGoods(lines);

        return new CreateOrderRes(orders.getId(), orderName, totalAmount);
    }

}
