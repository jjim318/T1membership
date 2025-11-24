package com.t1membership.item.controller;

import com.t1membership.ApiResult;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.image.dto.ExistingImageDTO;
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
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/item")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<RegisterItemRes> registerItem(@ModelAttribute RegisterItemReq postReq, @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        var postRes = itemService.registerItem(postReq, images);
        return new ApiResult<>(postRes);
    }


    @PutMapping(value = "/{itemNo}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<ModifyItemRes> modifyItem(
            @PathVariable Long itemNo,
            @ModelAttribute ModifyItemReq putReq,
            @RequestPart(value = "images", required = false) List<MultipartFile> newImages,
            @RequestPart(value = "existingImages", required = false) List<ExistingImageDTO> existingImages
    ) {
        putReq = putReq.toBuilder()
                .itemNo(itemNo)
                .build();

        var res = itemService.modifyItem(putReq, newImages, existingImages);
        return new ApiResult<>(res);
    }



    @DeleteMapping("/{itemNo}")
    public ApiResult<DeleteItemRes> deleteItem(@PathVariable Long itemNo) {
        DeleteItemReq deleteReq = DeleteItemReq.builder()
                .itemNo(itemNo)
                .build();
        var deleteRes = itemService.deleteItem(deleteReq);
        return new ApiResult<>(deleteRes);
    }


    @GetMapping({"/{itemNo}", "/{itemNo}/edit"})
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
