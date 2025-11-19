package com.t1membership.item.service;

import com.t1membership.coreDto.PageRequestDTO;
import com.t1membership.coreDto.PageResponseDTO;
import com.t1membership.image.domain.ImageEntity;
import com.t1membership.image.dto.ImageDTO;
import com.t1membership.image.service.FileService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ItemServiceImpl implements ItemService {

    private final FileService fileService;
    private final ItemRepository itemRepository;
    private final ModelMapper modelMapper;

    // =========================
    // 등록 (ADMIN 전용)
    // =========================
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public RegisterItemRes registerItem(RegisterItemReq req, List<MultipartFile> images) {

        // 필수값 방어
        if (!StringUtils.hasText(req.getItemName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상품명은 필수입니다.");
        }
        if (req.getItemPrice() == null || req.getItemPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "가격이 올바르지 않습니다.");
        }
        if (req.getItemStock() == null || req.getItemStock() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "재고가 올바르지 않습니다.");
        }

        // DTO -> Entity 매핑
        ItemEntity item = modelMapper.map(req, ItemEntity.class);

        // (선택) enum 기본값 처리: DTO가 null이면 서버에서 기본값 지정
        if (item.getItemCategory() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상품 카테고리는 필수 입력값입니다.");
            // 필요 시 기본 카테고리 지정 or BAD_REQUEST
            // item.setItemCategory(ItemCategory.DEFAULT);
        }
        if (item.getItemSellStatus() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상품 판매 상태는 필수 입력값입니다.");
            // 필요 시 기본 판매상태 지정
            // item.setItemSellStatus(ItemSellStatus.AVAILABLE);
        }

        ItemEntity saved = itemRepository.save(item);

        if (images != null && !images.isEmpty()) {
            int order = 0;
            for (MultipartFile file : images) {
                if (file.isEmpty()) continue;

                // (1) 실제 파일 저장 + 메타 정보 생성
                ImageDTO dto = fileService.uploadFile(file, order++);

                // (2) DTO -> ImageEntity 변환 + 아이템 연결
                ImageEntity image = ImageEntity.fromDtoForItem(dto, saved);

                // (3) 양방향 연관관계 유지
                saved.addImage(image);
            }
        }

        return RegisterItemRes.from(saved);
    }

    // =========================
    // 수정 (ADMIN 전용)
    // =========================
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public ModifyItemRes modifyItem(ModifyItemReq req, List<MultipartFile> images) {

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
            if (req.getItemPrice().compareTo(BigDecimal.ZERO) < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "가격이 올바르지 않습니다.");
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


        if (images != null && !images.isEmpty()) {
            int order = item.getImages().size(); // 기존 이미지 뒤에 이어붙이기
            for (MultipartFile file : images) {
                if (file.isEmpty()) continue;

                ImageDTO dto = fileService.uploadFile(file, order++);
                ImageEntity image = ImageEntity.fromDtoForItem(dto, item);
                item.addImage(image);
            }
        }

        ItemEntity saved = itemRepository.save(item);

        return ModifyItemRes.from(saved);
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

        // 🔥 필터 파라미터 (있다고 가정)
        var category  = req.getItemCategory(); // MD / MEMBERSHIP / POP / ALL
        var popPlayer = req.getPopPlayer();    // POP일 때만 의미 있음

        Page<ItemEntity> page;

        // 1) 카테고리가 지정된 경우
        if (category != null && category != ItemCategory.ALL) {

            // 1-1) 멤버십 전용: 활성 멤버십만
            if (category == ItemCategory.MEMBERSHIP) {
                page = itemRepository.findByItemCategoryAndMembershipActiveIsTrue(
                        ItemCategory.MEMBERSHIP,
                        pageable
                );

                // 1-2) POP 전용: 선수별 / 전체
            } else if (category == ItemCategory.POP) {

                // 선수별 POP
                if (popPlayer != null) {
                    // ⚠ 여기서는 List → PageImpl 로 한번 감쌉니다.
                    var list = itemRepository.findByItemCategoryAndPopPlayer(
                            ItemCategory.POP,
                            popPlayer
                    );
                    page = new PageImpl<>(list, pageable, list.size());
                }
                // POP 전체
                else {
                    var list = itemRepository.findByItemCategory(ItemCategory.POP);
                    page = new PageImpl<>(list, pageable, list.size());
                }

                // 1-3) MD 같은 나머지 카테고리
            } else {
                page = itemRepository.findAllByItemCategory(category, pageable);
            }

            // 2) 카테고리 필터 없거나 ALL인 경우 → 전체 조회
        } else {
            page = itemRepository.findAll(pageable);
        }

        // 엔티티 → 응답 DTO 매핑
        var content = page.map(SearchAllItemRes::from).getContent();

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
