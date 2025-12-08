package com.t1membership.order.service;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.item.repository.ItemRepository;
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

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class PopOrderCreator implements OrderCreator<CreatePopOrderReq> {
    private final MemberRepository memberRepository;
    private final ItemRepository itemRepository;
    //채팅주문 세부 구현체
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리

    @Override
    public OrderEntity create(String memberEmail, CreatePopOrderReq req) {

        // 1) 회원조회
        MemberEntity memberEntity = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보가 없습니다"));

        // 2) pop상품 조회
        ItemEntity popItem = itemRepository.findById(req.getPopId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "존재하지 않는 POP 상품"));

        // 3) POP 상품인지 카테고리 검증 (ItemCategory에 POP 있다고 가정)
        if (popItem.getItemCategory() != ItemCategory.POP) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "POP 상품이 아닙니다.");
        }

        // 4) 접근권 검증 (이미 구매했는지, 판매 중인지 등)
        validatePopEligibility(memberEntity, popItem);

        // 5) 금액 계산 (BigDecimal)
        BigDecimal price = popItem.getItemPrice(); // 단가

        // 6) 주문 헤더 생성
        OrderEntity order = new OrderEntity();
        order.setMember(memberEntity);
        order.setOrderStatus(OrderStatus.ORDERED);      // 주문 생성 상태 (결제 전)
        order.setOrderTotalPrice(price);                // 총 결제 금액(POP은 1개 고정)
        // order.setOrderType(OrderType.POP);  // 주문 타입이 있을 경우

        // 🔥🔥 POP 은 배송이 없으니까, NOT NULL 배송 필드에 기본값 채워주기
        // 이름은 웬만하면 회원 이름/닉네임/이메일 중 하나로
        String receiverName = null;
        // MemberEntity에 있는 필드 이름에 맞게 골라 쓰시면 됩니다
        // 예시: getMemberName(), getMemberNickName()
        try {
            // 있는 거 위주로 적당히 사용
            receiverName = memberEntity.getMemberName();
        } catch (Exception ignored) {}

        if (receiverName == null || receiverName.isBlank()) {
            try {
                receiverName = memberEntity.getMemberNickName();
            } catch (Exception ignored) {}
        }
        if (receiverName == null || receiverName.isBlank()) {
            receiverName = memberEntity.getMemberEmail();
        }

        order.setReceiverName(receiverName);
        order.setReceiverPhone("000-0000-0000");           // 형식 아무거나, NOT NULL만 피하면 됨
        order.setReceiverAddress("POP 상품 (배송 없음)");   // 진짜 배송 안 함 표시
        order.setReceiverZipCode("00000");                 // 더미 우편번호
        order.setReceiverDetailAddress("온라인 POP 이용권"); // 이건 nullable 이라 안 채워도 되지만 같이 넣어도 됨

        // 7) 주문-아이템 스냅샷 생성
        // - 공통 팩토리 메서드 사용 (단가/합계/스냅샷 계산은 OrderItemEntity.of에서 처리)
        OrderItemEntity orderItem = OrderItemEntity.of(popItem, 1);
        orderItem.setPlayerSnapshot(popItem.getPopPlayer());   // ★ 스냅샷 저장

        // 8) 연관관계 & 총액 재계산
        order.addItem(orderItem);   // orderItems에 추가 + recalcTotal() 호출

        return order;
    }

    //이미 구매한 팬인지 검증
    private void validatePopEligibility(MemberEntity member, ItemEntity popItem) {
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
