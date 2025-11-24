package com.t1membership.cart.service;

import com.t1membership.cart.domain.CartEntity;
import com.t1membership.cart.dto.addCartItem.AddCartItemReq;
import com.t1membership.cart.dto.addCartItem.AddCartItemRes;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderReq;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderRes;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import com.t1membership.cart.repository.CartRepository;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.item.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final ItemRepository itemRepository;

    // ========== 공통 유틸 ==========
    private String currentMemberEmailOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return auth.getName();
    }

    // ========== 담기 ==========
    @Override
    public AddCartItemRes addCartItem(String memberEmail, AddCartItemReq req) {
        // 보안: 파라미터로 받은 memberEmail 무시하고, 항상 SecurityContext 기준 사용을 권장
        String loginEmail = currentMemberEmailOrThrow();
        if (!loginEmail.equalsIgnoreCase(memberEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 장바구니만 수정 가능합니다.");
        }

        Long itemNo = req.getItemNo();
        int addQty = Math.max(1, req.getQuantity()); // 최소 1

        ItemEntity item = itemRepository.findById(itemNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "상품을 찾을 수 없습니다."));

        // (정책에 맞게 수정) 판매가능/품절 체크
        // if (item.getItemSellStatus() != ItemSellStatus.ON_SALE) ...
        if (item.getItemStock() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "품절 상품입니다.");
        }

        // 멤버+아이템으로 라인 조회 → 있으면 수량 +=, 없으면 생성
        CartEntity line = cartRepository
                .findByMember_MemberEmailAndItem_ItemNo(loginEmail, itemNo)
                .orElseGet(() -> CartEntity.builder()
                        .member(/* MemberEntity proxy or fetch 필요. 보유중이면 set */ null)
                        .item(item)
                        .itemQuantity(0)
                        .build());

        int newQty = line.getItemQuantity() + addQty;
        // 재고 상한 방어
        if (newQty > item.getItemStock()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "재고보다 많은 수량을 담을 수 없습니다.");
        }
        line.setItemQuantity(newQty);

        CartEntity saved = cartRepository.save(line);

        // DTO 변환
        // return AddCartItemRes.from(saved); // from이 있다면
        return AddCartItemRes.builder()
                .itemNo(saved.getItem().getItemNo())
                .itemQuantity(saved.getItemQuantity())
                .build();
    }

    // ========== 삭제 ==========
    @Override
    public DeleteCartItemRes deleteCartItem(String memberEmail, DeleteCartItemReq req) {
        String loginEmail = currentMemberEmailOrThrow();
        if (!loginEmail.equalsIgnoreCase(memberEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 장바구니만 수정 가능합니다.");
        }

        Long itemNo = req.getItemNo();

        CartEntity line = cartRepository
                .findByMember_MemberEmailAndItem_ItemNo(loginEmail, itemNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장바구니에 없는 상품입니다."));

        cartRepository.delete(line);

        // return DeleteCartItemRes.success(itemNo); // success 팩토리 메서드가 있다면
        return DeleteCartItemRes.builder()
                .itemNo(itemNo)
                .build();
    }

    // ========== 수량 변경 ==========
    @Override
    public UpdateCartItemQuantityRes updateQuantity(String memberEmail, Long itemNo, UpdateCartItemQuantityReq req) {
        String loginEmail = currentMemberEmailOrThrow();
        if (!loginEmail.equalsIgnoreCase(memberEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 장바구니만 수정 가능합니다.");
        }

        int qty = req.getQuantity();
        if (qty < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수량은 0 이상이어야 합니다.");
        }

        CartEntity line = cartRepository
                .findByMember_MemberEmailAndItem_ItemNo(loginEmail, itemNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장바구니에 없는 상품입니다."));

        // 0이면 삭제로 처리
        if (qty == 0) {
            cartRepository.delete(line);
            return UpdateCartItemQuantityRes.builder()
                    .itemNo(itemNo)
                    .itemQuantity(0)
                    .build();
        }

        // 상한/재고 검사
        ItemEntity item = line.getItem();
        if (qty > item.getItemStock()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "재고보다 많은 수량을 담을 수 없습니다.");
        }

        line.setItemQuantity(qty);
        CartEntity saved = cartRepository.save(line);

        // return UpdateCartItemQuantityRes.from(saved);
        return UpdateCartItemQuantityRes.builder()
                .itemNo(saved.getItem().getItemNo())
                .itemQuantity(saved.getItemQuantity())
                .build();
    }

    // ========== 결제 직전 검증/요약 ==========
    @Override
    @Transactional(readOnly = true)
    public PrepareOrderRes prepareOrder(PrepareOrderReq req) {
        String loginEmail = currentMemberEmailOrThrow();

        List<Long> requested = Optional.ofNullable(req.getItemNos()).orElseGet(List::of);
        if (requested.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "선택된 상품이 없습니다.");
        }

        // 성능: fetch join으로 N+1 방지하는 쿼리를 CartRepository에 구현해두는 걸 추천
        // 여기서는 단순 find 후 접근으로 가정
        List<CartEntity> lines = cartRepository
                .findAllByMember_MemberEmailOrderByCartNoDesc(loginEmail)
                .stream()
                .filter(l -> requested.contains(l.getItem().getItemNo()))
                .toList();

        Set<Long> foundNos = lines.stream()
                .map(l -> l.getItem().getItemNo())
                .collect(Collectors.toSet());

        List<PrepareOrderRes.Violation> violations = new ArrayList<>();
        for (Long no : requested) {
            if (!foundNos.contains(no)) {
                violations.add(PrepareOrderRes.Violation.builder()
                        .itemNo(no).code("NOT_FOUND_IN_CART").message("장바구니에 없는 상품입니다.").build());
            }
        }

        int totalQty = 0;                          // 총 수량(개수) → int 유지
        BigDecimal totalAmt = BigDecimal.ZERO;     // 총 금액 → BigDecimal로 변경
        List<PrepareOrderRes.Line> resultLines = new ArrayList<>();

        for (CartEntity line : lines) {
            ItemEntity item = line.getItem();

            // 판매 가능/재고 정책에 맞게 수정
            // if (item.getItemSellStatus() != ItemSellStatus.ON_SALE) ...
            if (item.getItemStock() < line.getItemQuantity()) {
                violations.add(PrepareOrderRes.Violation.builder()
                        .itemNo(item.getItemNo()).code("OUT_OF_STOCK").message("재고가 부족합니다.").build());
                continue;
            }

            // ====== 여기부터 금액 BigDecimal 처리 ======
            // ItemEntity.getItemPrice() 가 BigDecimal 이라고 가정
            BigDecimal unitPrice = item.getItemPrice();
            int qty = line.getItemQuantity();
            BigDecimal lineAmt = unitPrice.multiply(BigDecimal.valueOf(qty));

            resultLines.add(PrepareOrderRes.Line.builder()
                    .itemNo(item.getItemNo())
                    .itemName(item.getItemName())
                    .unitPrice(unitPrice)
                    .quantity(qty)
                    .lineAmount(lineAmt)
                    .build());

            totalQty += qty;
            totalAmt = totalAmt.add(lineAmt);
        }

        boolean ok = violations.isEmpty() && !resultLines.isEmpty();

        return PrepareOrderRes.builder()
                .lines(resultLines)
                .totalQuantity(totalQty)
                .totalAmount(totalAmt)
                .ok(ok)
                .violations(violations)
                .build();
    }
}
