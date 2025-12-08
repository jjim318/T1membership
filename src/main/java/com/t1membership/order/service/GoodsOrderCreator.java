package com.t1membership.order.service;

import com.t1membership.cart.domain.CartEntity;
import com.t1membership.cart.repository.CartRepository;
import com.t1membership.item.constant.ItemSellStatus;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.item.repository.ItemRepository;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.user.CreateGoodsOrderReq;
import com.t1membership.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class GoodsOrderCreator implements OrderCreator<CreateGoodsOrderReq> {

    private final MemberRepository memberRepository;
    private final ItemRepository itemRepository;
    private final CartRepository cartRepository;
    //주문 한 건을 생성해서 결제 준비값을 돌려줌
    //생성만 여기서 코드를 만듦(서비스 계층의 세부 구현체
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리

    @Override
    @Transactional
    public OrderEntity create(String memberEmail, CreateGoodsOrderReq req) {

        // 1) 회원 검증
        MemberEntity member = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원이 존재하지 않습니다."));

        // 2) 주문 엔티티 생성 + 공통 정보 세팅
        OrderEntity order = new OrderEntity();
        order.setMember(member);
        order.setReceiverName(req.getReceiverName());
        order.setReceiverPhone(req.getReceiverPhone());
        order.setReceiverAddress(req.getReceiverAddress());
        order.setReceiverDetailAddress(req.getReceiverDetailAddress());
        order.setReceiverZipCode(req.getReceiverZipCode());
        order.setMemo(req.getMemo());
        order.setOrderStatus(OrderStatus.ORDERED);

        // 🔥 NPE 방지: 리스트가 null이면 새 리스트 세팅
        if (order.getOrderItems() == null) {
            order.setOrderItems(new ArrayList<>());
        }

        BigDecimal totalAmount;

        // 3) 단건 vs 장바구니 분기
        boolean hasSingle =
                req.getItemId() != null && req.getQuantity() != null;
        boolean hasCart =
                req.getCartItemIds() != null && !req.getCartItemIds().isEmpty();

        if (hasSingle && !hasCart) {
            totalAmount = createFromSingleItem(order, req);
        } else if (hasCart) {
            totalAmount = createFromCartItems(order, memberEmail, req);
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "단건 또는 장바구니 정보가 올바르지 않습니다."
            );
        }

        // 4) 총 금액 세팅 (recalcTotal 도 있지만, 명시적으로 맞춰줌)
        order.setOrderTotalPrice(totalAmount);

        // ❌ 여기서 save 금지: Creator는 "엔티티 조립"만 담당
        // orderRepository.save(order);

        return order; // 서비스에서 save + Toss 호출
    }

    // ==========================
    // 단건 주문 처리
    // ==========================
    private BigDecimal createFromSingleItem(OrderEntity order, CreateGoodsOrderReq req) {

        if (req.getItemId() == null || req.getQuantity() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "단건 주문 시 itemId와 quantity는 필수입니다.");
        }

        ItemEntity item = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "존재하지 않는 상품입니다."));

        int quantity = req.getQuantity();
        if (quantity <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "수량은 1개 이상이어야 합니다.");
        }

        // 재고/판매가능 여부 체크
        validateItemStock(item, quantity);

        // 🔥 주문 아이템 생성 (스냅샷 + priceAtOrder + lineTotal 계산까지 포함)
        //    - OrderItemEntity.of(...) 안에서
        //      priceAtOrder, itemNameSnapshot, itemPriceSnapshot, lineTotal 을 다 세팅해 줍니다.
        OrderItemEntity orderItem = OrderItemEntity.of(item, quantity);

        // 🔥 연관관계 세팅 (order <-> orderItem)
        orderItem.setOrder(order);
        order.getOrderItems().add(orderItem);

        // 단건 주문 금액 = 라인 합계
        return orderItem.getLineTotal();
    }

    // ==========================
    // 장바구니 선택 주문 처리 (여러 개 지원)
    // ==========================
    private BigDecimal createFromCartItems(
            OrderEntity order,
            String memberEmail,
            CreateGoodsOrderReq req
    ) {
        List<Long> cartItemIds = req.getCartItemIds();

        if (cartItemIds == null || cartItemIds.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "장바구니 정보가 없습니다."
            );
        }

        // cartItemIds 에 넘어온 PK 들로 CartEntity 조회
        List<CartEntity> cartItems = cartRepository.findAllById(cartItemIds);

        if (cartItems.size() != cartItemIds.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "유효하지 않은 장바구니 항목이 있습니다.");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        boolean first = true;

        for (CartEntity cartItem : cartItems) {

            // 🔥 본인 장바구니인지 검증 (이것만으로 충분)
            if (!cartItem.getMember().getMemberEmail().equals(memberEmail)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "본인의 장바구니가 아닙니다.");
            }

            ItemEntity item = cartItem.getItem();
            int quantity = cartItem.getItemQuantity();

            // 재고/판매가능 여부 체크
            validateItemStock(item, quantity);

            // 주문 아이템 생성
            OrderItemEntity orderItem = OrderItemEntity.of(item, quantity);

            // 연관관계 세팅
            orderItem.setOrder(order);
            order.getOrderItems().add(orderItem);

            if (first) {
                // order.setOrderType(item.getItemType()); // 필요하면 여기서 설정
                first = false;
            }

            // 라인 합계는 orderItem 안에 있음
            totalAmount = totalAmount.add(orderItem.getLineTotal());
        }

        return totalAmount;
    }


    //상품 재고 + 판매 상태 검증
    private void validateItemStock(ItemEntity item, int quantity) {
        // 재고 체크
        if (item.getItemStock() < quantity) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "재고가 부족한 상품이 있습니다: " + item.getItemName());
        }
        // 판매 상태(enum) 체크
        if (item.getItemSellStatus() != ItemSellStatus.SELL) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "현재 판매 불가능한 상품이 포함되어 있습니다: " + item.getItemName());
        }
    }
}
