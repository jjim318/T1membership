package com.t1membership.order.service;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.MembershipAllowedType;
import com.t1membership.item.constant.MembershipPayType;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

        // 1) 회원 조회
        MemberEntity member = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."));

        // 2) 멤버십 Item 조회 (planCode 기준)
        ItemEntity membershipItem = itemRepository.findById(Long.valueOf(req.getPlanCode()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버십 상품을 찾을 수 없습니다."));

        // 3) 카테고리 검증
        if (membershipItem.getItemCategory() != ItemCategory.MEMBERSHIP) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MEMBERSHIP 상품이 아닙니다.");
        }

        //4) 멤버십 정책 검증
        //    MembershipAllowedType : ONE_TIME_ONLY / SUBSCRIPTION_ONLY / BOTH
        //    autoRenew(boolean) → MembershipPayType 으로 변환해서 검사
        MembershipPayType reqPayType = req.isAutoRenew()
                ? MembershipPayType.RECURRING     // autoRenew = true → 정기결제
                : MembershipPayType.ONE_TIME;     // false → 단건결제

        // 5) 정책 검증 (MembershipAllowedType)
        MembershipAllowedType allowed = membershipItem.getMembershipAllowedType();

        if (allowed == MembershipAllowedType.ONE_TIME_ONLY && reqPayType == MembershipPayType.RECURRING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 멤버십은 단건 결제만 허용됩니다.");
        }

        if (allowed == MembershipAllowedType.RECURRING_ONLY && reqPayType == MembershipPayType.ONE_TIME) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 멤버십은 정기결제만 가능합니다.");
        }

        //  6) 가격 계산
        //    - 예시: item.price 를 "월 구독료" 라고 보고 개월 수만큼 곱함
        BigDecimal pricePerMonth = membershipItem.getItemPrice();

        // months 도 BigDecimal로 변환해서 곱하기
        BigDecimal totalPrice = pricePerMonth.multiply(BigDecimal.valueOf(req.getMonths()));

        // 7) 기간 계산
        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = startDate.plusMonths(req.getMonths());

        // 8) 주문 엔티티 생성
        OrderEntity order = OrderEntity.builder()
                .member(member)
                .orderStatus(OrderStatus.ORDERED)   // 결제 전 상태
                .orderTotalPrice(totalPrice)             // 총 금액(BigDecimal)

                // 멤버십 스냅샷 정보 저장 (나중에 정책 바뀌어도 과거 주문 데이터는 유지됨)
                .membershipPlanCode(req.getPlanCode())
                .membershipMonths(req.getMonths())
                .membershipStartDate(startDate)
                .membershipEndDate(endDate)
                .membershipPayType(reqPayType)
                .membershipMemberName(req.getMemberName())
                .membershipMemberBirth(req.getMemberBirth())
                .membershipMemberPhone(req.getMemberPhone())
                .autoRenew(req.isAutoRenew())
                .build();

        // 9) 주문-아이템 스냅샷 생성
        OrderItemEntity orderItem = OrderItemEntity.builder()
                .order(order)
                .item(membershipItem)
                .itemNameSnapshot(membershipItem.getItemName())
                .itemCategorySnapshot(membershipItem.getItemCategory())
                .itemPriceSnapshot(pricePerMonth)   // BigDecimal 로 스냅샷 저장 추천
                .priceAtOrder(pricePerMonth)
                .quantity(1)                // 멤버십은 항상 1개
                .build();

        // 양방향 매핑 시 편의 메서드
        if (order.getOrderItems() != null) {
            order.getOrderItems().add(orderItem);
        }

        return order;
    }
}
