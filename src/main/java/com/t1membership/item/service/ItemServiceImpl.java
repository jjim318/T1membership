package com.t1membership.item.service;

import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.item.domain.ItemEntity;
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
import com.t1membership.item.repository.ItemRepository;
import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.ItemSellStatus;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class ItemServiceImpl implements ItemService {

    private final ItemRepository itemRepository;
    private final ModelMapper modelMapper;

    // =========================
    // 등록 (ADMIN 전용)
    // =========================
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public RegisterItemRes registerItem(RegisterItemReq req) {

        // 필수값 방어
        if (!StringUtils.hasText(req.getItemName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상품명은 필수입니다.");
        }
        if (req.getItemPrice() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "가격이 올바르지 않습니다.");
        }
        if ( req.getItemStock() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "재고가 올바르지 않습니다.");
        }

        // DTO -> Entity 매핑
        ItemEntity item = modelMapper.map(req, ItemEntity.class);

        // (선택) enum 기본값 처리: DTO가 null이면 서버에서 기본값 지정
        if (item.getItemCategory() == null) {
            // 필요 시 기본 카테고리 지정 or BAD_REQUEST
            // item.setItemCategory(ItemCategory.DEFAULT);
        }
        if (item.getItemSellStatus() == null) {
            // 필요 시 기본 판매상태 지정
            // item.setItemSellStatus(ItemSellStatus.AVAILABLE);
        }

        ItemEntity saved = itemRepository.save(item);
        return RegisterItemRes.from(saved);
    }

    // =========================
    // 수정 (ADMIN 전용)
    // =========================
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public ModifyItemRes modifyItem(ModifyItemReq req) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        if (req.getItemNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대상 아이템 ID가 없습니다.");
        }

        ItemEntity item = itemRepository.findById(req.getItemNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이템을 찾을 수 없습니다."));

        // --- 불변 필드 방어: itemNo는 변경 불가 ---

        // --- 변경 가능 필드만 업데이트 (null-안전) ---
        if (StringUtils.hasText(req.getItemName())) {
            item = ItemEntity.builder()
                    .itemNo(item.getItemNo()) // ID 유지
                    .itemName(req.getItemName())
                    .itemPrice(item.getItemPrice())
                    .itemStock(item.getItemStock())
                    .itemCategory(item.getItemCategory())
                    .itemSellStatus(item.getItemSellStatus())
                    .build();
            // 위처럼 빌더 재생성 방식을 쓰면 불변 스타일 유지 가능.
            // 만약 세터가 있다면 item.setItemName(req.getItemName()); 로 단순화 가능.
        }

        if (req.getItemPrice() != null) {
            if (req.getItemPrice() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "가격이 올바르지 않습니다.");
            // 세터가 없다면 위 빌더 재생성 방식으로 다시 구성
            item = ItemEntity.builder()
                    .itemNo(item.getItemNo())
                    .itemName(item.getItemName())
                    .itemPrice(req.getItemPrice())
                    .itemStock(item.getItemStock())
                    .itemCategory(item.getItemCategory())
                    .itemSellStatus(item.getItemSellStatus())
                    .build();
        }

        if (req.getItemStock() != null) {
            if (req.getItemStock() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "재고가 올바르지 않습니다.");
            item = ItemEntity.builder()
                    .itemNo(item.getItemNo())
                    .itemName(item.getItemName())
                    .itemPrice(item.getItemPrice())
                    .itemStock(req.getItemStock())
                    .itemCategory(item.getItemCategory())
                    .itemSellStatus(item.getItemSellStatus())
                    .build();
        }

        if (req.getItemCategory() != null) {
            ItemCategory cat = req.getItemCategory();
            item = ItemEntity.builder()
                    .itemNo(item.getItemNo())
                    .itemName(item.getItemName())
                    .itemPrice(item.getItemPrice())
                    .itemStock(item.getItemStock())
                    .itemCategory(cat)
                    .itemSellStatus(item.getItemSellStatus())
                    .build();
        }

        if (req.getItemSellStatus() != null) {
            ItemSellStatus status = req.getItemSellStatus();
            item = ItemEntity.builder()
                    .itemNo(item.getItemNo())
                    .itemName(item.getItemName())
                    .itemPrice(item.getItemPrice())
                    .itemStock(item.getItemStock())
                    .itemCategory(item.getItemCategory())
                    .itemSellStatus(status)
                    .build();
        }

        // 더티체킹 대신 명시 저장(불변 빌더 재생성 방식을 썼으므로)
        item = itemRepository.save(item);
        return ModifyItemRes.from(item);
    }

    // =========================
    // 삭제 (기본: 하드 삭제)
    // =========================
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public DeleteItemRes deleteItem(DeleteItemReq req) {

        if (req.getItemNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대상 아이템 ID가 없습니다.");
        }

        ItemEntity item = itemRepository.findById(req.getItemNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이템을 찾을 수 없습니다."));

        // 엔티티에 soft-delete 필드가 없으므로 하드 삭제.
        // (운영 정책상 중단처리로 대체하려면 itemSellStatus를 DISCONTINUED 등으로 바꾸는 방식도 가능)
        itemRepository.delete(item);

        return DeleteItemRes.success(req.getItemNo());
    }

    // =========================
    // 전체 조회(페이지)
    // =========================
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SearchAllItemRes> searchAllItem(SearchAllItemReq req) {
        var pageable = req.toPageable();
        var page = itemRepository.findAll(pageable);
        var content = page.map(SearchAllItemRes::from).toList();

        //  SearchAllItemReq → PageRequestDTO 변환(어댑터)
        PageRequestDTO pr = PageRequestDTO.builder()
                .page(req.getPage())
                .size(req.getSize())
                .build();

        // 빌더 체이닝(생성자 파라미터명 기준: pageRequestDTO, dtoList, total)
        return PageResponseDTO.<SearchAllItemRes>withAll()
                .pageRequestDTO(pr)
                .dtoList(content)
                .total((int) page.getTotalElements())
                .build();
    }


    // =========================
    // 단건 조회
    // =========================
    @Override
    @Transactional(readOnly = true)
    public SearchOneItemRes searchOneItem(SearchOneItemReq req) {
        if (req.getItemNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이템 ID가 필요합니다.");
        }
        ItemEntity item = itemRepository.findById(req.getItemNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이템을 찾을 수 없습니다."));

        return SearchOneItemRes.from(item);
    }
}
