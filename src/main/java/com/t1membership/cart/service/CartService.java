package com.t1membership.cart.service;

import com.t1membership.cart.dto.addCartItem.AddCartItemReq;
import com.t1membership.cart.dto.addCartItem.AddCartItemRes;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemReq;
import com.t1membership.cart.dto.deleteCartItem.DeleteCartItemRes;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderReq;
import com.t1membership.cart.dto.prepareOrder.PrepareOrderRes;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityReq;
import com.t1membership.cart.dto.updateCartItemQuantity.UpdateCartItemQuantityRes;

public interface CartService {

    AddCartItemRes addCartItem(String memberEmail, AddCartItemReq addCartItemReq);

    DeleteCartItemRes deleteCartItem(String memberEmail, DeleteCartItemReq deleteCartItemReq);

    UpdateCartItemQuantityRes updateQuantity(String memberEmail, Long itemNo, UpdateCartItemQuantityReq updateCartItemQuantityReq);

    PrepareOrderRes prepareOrder(PrepareOrderReq prepareOrderReq);
}
