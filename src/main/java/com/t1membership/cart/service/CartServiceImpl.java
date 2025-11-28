package com.t1membership.cart.service;

import com.t1membership.cart.domain.CartEntity;
import com.t1membership.cart.dto.addCartItem.AddCartItemReq;
import com.t1membership.cart.dto.addCartItem.AddCartItemRes;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderReq;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderRes;
import com.t1membership.cart.dto.readCart.CartItemRes;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import com.t1membership.cart.repository.CartRepository;
import com.t1membership.image.domain.ImageEntity;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.item.repository.ItemRepository;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
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
    private final MemberRepository memberRepository;

    // ========== 공통 유틸 ==========
    private String currentMemberEmailOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        String loginEmail = auth.getName();

        if (loginEmail == null || loginEmail.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "로그인 정보를 찾을 수 없습니다."
            );
        }

        return loginEmail;
    }

    // ========== 담기 ==========
    @Override
    @Transactional
    public AddCartItemRes addCartItem(String memberEmail, AddCartItemReq req) {

        // 0. 보안: URL 의 memberEmail 은 무시하고, 토큰 기준으로만 체크
        String loginEmail = currentMemberEmailOrThrow();
        if (!loginEmail.equalsIgnoreCase(memberEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "본인 장바구니만 수정 가능합니다."
            );
        }

        // 1. 회원·상품 조회
        MemberEntity member = memberRepository.findByMemberEmail(loginEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "회원 정보를 찾을 수 없습니다."
                ));

        Long itemNo = req.getItemNo();
        int addQty = Math.max(1, req.getQuantity()); // 최소 1 이상으로 고정

        ItemEntity item = itemRepository.findById(itemNo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "상품을 찾을 수 없습니다."
                ));

        if (item.getItemStock() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "품절 상품입니다."
            );
        }

        // 2. 옵션 값 꺼내기
        String optionKind  = req.getOptionKind();   // "SIZE", "PLAYER", ...
        String optionValue = req.getOptionValue();  // "S", "FAKER" ...
        String optionLabel = req.getOptionLabel();  // "size / S" 같은 표시용

        // 3. 옵션 기준으로 기존 라인 조회
        Optional<CartEntity> optionalLine;

        if (optionValue == null || optionValue.isBlank()) {
            // 옵션이 없는 상품 (티켓홀더 같은 것)
            optionalLine =
                    cartRepository.findByMember_MemberEmailAndItem_ItemNoAndOptionValueIsNull(
                            loginEmail,
                            itemNo
                    );
        } else {
            // 옵션이 있는 상품 → optionValue 까지 포함해서 라인 찾기
            optionalLine =
                    cartRepository.findByMember_MemberEmailAndItem_ItemNoAndOptionValue(
                            loginEmail,
                            itemNo,
                            optionValue
                    );
        }

        // 4. 기존 라인이 있으면 수량만 증가, 없으면 새로 생성
        CartEntity line = optionalLine.orElseGet(() ->
                CartEntity.builder()
                        .member(member)
                        .item(item)
                        .itemQuantity(0)
                        .optionKind(optionKind)       // 🔥 새 라인에 옵션 정보 세팅
                        .optionValue(optionValue)
                        .optionLabel(optionLabel)
                        .build()
        );

        int newQty = line.getItemQuantity() + addQty;

        if (newQty > item.getItemStock()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "재고보다 많은 수량을 담을 수 없습니다."
            );
        }

        line.setItemQuantity(newQty);

        CartEntity saved = cartRepository.save(line);

        // 5. 응답 DTO (필요한 필드만 내려주면 됨)
        return AddCartItemRes.builder()
                .itemNo(saved.getItem().getItemNo())
                .itemQuantity(saved.getItemQuantity())   // 원하면 옵션도 내려주기
                .build();
    }


    // ========== 삭제 ==========
    @Override
    @Transactional
    public DeleteCartItemRes deleteCartItem(String memberEmail, DeleteCartItemReq req) {

        // 🔐 로그인 사용자 검증
        String loginEmail = currentMemberEmailOrThrow();
        if (!loginEmail.equalsIgnoreCase(memberEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "본인 장바구니만 수정 가능합니다."
            );
        }

        // 🔥 이제는 itemNo 말고 cartId 로 한 줄 지정
        Long cartNo = req.getCartNo();
        if (cartNo == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "삭제할 장바구니 번호가 없습니다."
            );
        }

        // 🔥 cartId + memberEmail 로 한 줄만 찾기
        CartEntity line = cartRepository
                .findByCartNoAndMember_MemberEmail(cartNo, loginEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "장바구니 상품을 찾을 수 없습니다."
                ));

        cartRepository.delete(line);

        return DeleteCartItemRes.builder()
                .cartNo(cartNo)   // 응답도 cartId 기준으로
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


    // ========== 🔥 장바구니 조회 (GET /cart 용) ==========
    @Override
    @Transactional(readOnly = true)
    public List<CartItemRes> readMyCart() {

        String loginEmail = currentMemberEmailOrThrow();

        // 로그인한 회원의 장바구니 라인 최신순
        List<CartEntity> lines =
                cartRepository.findAllByMember_MemberEmailOrderByCartNoDesc(loginEmail);

        return lines.stream()
                .map(line -> {
                    ItemEntity item = line.getItem();

                    int qty = line.getItemQuantity();
                    BigDecimal unitPrice = item.getItemPrice();
                    BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

                    boolean membershipOnly = false;

                    if (item.getItemCategory() != null) {
                        var cat = item.getItemCategory();

                        // 🔥 MD + MEMBERSHIP 둘 다 멤버십 전용으로 취급
                        membershipOnly =
                                "MD".equalsIgnoreCase(cat.toString()) ||
                                        "MEMBERSHIP".equalsIgnoreCase(cat.toString());
                    }


                    boolean soldOut = item.getItemStock() <= 0;

                    return CartItemRes.builder()
                            .itemNo(item.getItemNo())
                            .cartNo(line.getCartNo())
                            .itemName(item.getItemName())
                            .thumbnail(resolveThumbnail(item))  // 🔥 썸네일 추출
                            .quantity(qty)
                            .unitPrice(unitPrice)
                            .lineTotal(lineTotal)
                            .membershipOnly(membershipOnly)
                            .soldOut(soldOut)
                            .optionLabel(null)                  // 옵션은 나중에 구조 잡으면 채우기
                            .build();
                })
                .toList();
    }


    // ========== 🔥 썸네일 추출 유틸 ==========
    private String resolveThumbnail(ItemEntity item) {
        // 이미지가 없으면 기본 썸네일
        if (item.getImages() == null || item.getImages().isEmpty()) {
            // 프론트에서 준비해둘 기본 이미지 경로 (원하면 수정)
            return "/shop/placeholder.png";
        }

        return item.getImages().stream()
                // sortOrder(또는 imageOrder) 기준으로 정렬해서 가장 앞의 이미지 사용
                .sorted(Comparator.comparing(
                        img -> Optional.ofNullable(getSortOrderSafe(img)).orElse(999)
                ))
                .findFirst()
                .map(img -> {
                    // url 이 있으면 우선 사용, 없으면 fileName 반환
                    if (img.getUrl() != null && !img.getUrl().isBlank()) {
                        return img.getUrl();
                    }
                    return img.getFileName();
                })
                .orElse("/shop/placeholder.png");
    }

    // ImageEntity 안에 sortOrder 필드명이 어떻게 되어있는지 몰라서
    // 안전하게 한 번 감싸주는 메서드
    private Integer getSortOrderSafe(ImageEntity img) {
        try {
            return img.getSortOrder();   // 필드명이 sortOrder 라고 가정
        } catch (Exception e) {
            return null;
        }
    }

}
