package com.t1membership.item.service;

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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ItemService {

    RegisterItemRes registerItem(RegisterItemReq registerItemReq, List<MultipartFile> images);

    ModifyItemRes modifyItem(ModifyItemReq modifyItemReq, List<MultipartFile> images);

    DeleteItemRes deleteItem(DeleteItemReq deleteItemReq);

    PageResponseDTO<SearchAllItemRes> searchAllItem(SearchAllItemReq searchAllItemReq);

    SearchOneItemRes searchOneItem(SearchOneItemReq searchOneItemReq);

}
