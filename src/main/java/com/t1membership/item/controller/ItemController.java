package com.t1membership.item.controller;

import com.t1membership.ApiResult;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.item.dto.deleteItem.DeleteItemReq;
import com.t1membership.item.dto.deleteItem.DeleteItemRes;
import com.t1membership.item.dto.modifyItem.ModifyItemReq;
import com.t1membership.item.dto.modifyItem.ModifyItemRes;
import com.t1membership.item.dto.registerItem.RegisterItemReq;
import com.t1membership.item.dto.registerItem.RegisterItemRes;
import com.t1membership.item.dto.searchAllItem.SearchAllItemReq;
import com.t1membership.item.dto.searchAllItem.SearchAllItemRes;
import com.t1membership.item.dto.searchOneItem.SearchOneItemReq;
import com.t1membership.item.dto.searchOneItem.SearchOneItemRes;
import com.t1membership.item.service.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/item")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @PostMapping
    public ApiResult<RegisterItemRes> registerItem(@RequestBody RegisterItemReq postReq) {
        var postRes = itemService.registerItem(postReq);
        return new ApiResult<>(postRes);
    }


    @PutMapping(value = "/{itemNo}")
    public ApiResult<ModifyItemRes> modifyItem(@PathVariable Long itemNo, @RequestBody ModifyItemReq putReq) {
        putReq = putReq.toBuilder()
                .itemNo(itemNo)
                .build();
        var putRes = itemService.modifyItem(putReq);
        return new ApiResult<>(putRes);
    }


    @DeleteMapping("/{itemNo}")
    public ApiResult<DeleteItemRes> deleteItem(@PathVariable Long itemNo) {
        DeleteItemReq deleteReq = DeleteItemReq.builder()
                .itemNo(itemNo)
                .build();
        var deleteRes = itemService.deleteItem(deleteReq);
        return new ApiResult<>(deleteRes);
    }


    @GetMapping({"/{itemNo}", "/{itemNo}}/edit"})
    public ApiResult<SearchOneItemRes> searchOneItem(@PathVariable Long itemNo) {
        SearchOneItemReq searchReq = SearchOneItemReq.builder()
                .itemNo(itemNo).build();
        var searchRes = itemService.searchOneItem(searchReq);
        return new ApiResult<>(searchRes);
    }


    @GetMapping
    public ApiResult<PageResponseDTO<SearchAllItemRes>> searchAllItem(@ModelAttribute SearchAllItemReq getReq) {
        var getAllRes = itemService.searchAllItem(getReq);
        return new ApiResult<>(getAllRes);
    }


}
