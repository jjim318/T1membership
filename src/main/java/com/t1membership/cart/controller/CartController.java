package com.t1membership.cart.controller;

import com.t1membership.ApiResult;
import com.t1membership.cart.dto.addCartItem.AddCartItemReq;
import com.t1membership.cart.dto.addCartItem.AddCartItemRes;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderReq;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderRes;
import com.t1membership.cart.dto.readCart.CartItemRes;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;
import com.t1membership.cart.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // 담기
    @PostMapping("/{memberEmail}/items")
    public ApiResult<AddCartItemRes> addCartItem(@PathVariable String memberEmail,
                                                 @RequestBody AddCartItemReq postReq) {
        var postRes = cartService.addCartItem(memberEmail, postReq);
        return new ApiResult<>(postRes);
    }

    // 삭제
    // /cart/{memberEmail}/items/{cartNo}
    @DeleteMapping("/{memberEmail}/items/{cartNo}")
    public ApiResult<DeleteCartItemRes> deleteCartItem(
            @PathVariable String memberEmail,
            @PathVariable Long cartNo
    ) {
        DeleteCartItemReq deleteReq = DeleteCartItemReq.builder()
                .cartNo(cartNo)   // 🔥 itemNo 말고 cartNo 셋팅
                .build();

        DeleteCartItemRes deleteRes = cartService.deleteCartItem(memberEmail, deleteReq);
        return new ApiResult<>(deleteRes);
    }


    // 수량 변경
    @PutMapping("/{memberEmail}/items/{itemNo}")
    public ApiResult<UpdateCartItemQuantityRes> updateQuantity(@PathVariable String memberEmail,
                                                               @PathVariable Long itemNo,
                                                               @RequestBody UpdateCartItemQuantityReq putReq) {
        var patchRes = cartService.updateQuantity(memberEmail, itemNo, putReq);
        return new ApiResult<>(patchRes);
    }

    // 결제 직전 검증/요약
    @PostMapping("/prepare")
    public ApiResult<PrepareOrderRes> prepareOrder(@RequestBody PrepareOrderReq postReq) {
        var postRes = cartService.prepareOrder(postReq);
        return new ApiResult<>(postRes);
    }

    @GetMapping
    public ApiResult<List<CartItemRes>> readMyCart() {
        var result = cartService.readMyCart();
        return new ApiResult<>(result);
    }


}
