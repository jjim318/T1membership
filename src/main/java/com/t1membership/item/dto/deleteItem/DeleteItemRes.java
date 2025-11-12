package com.t1membership.item.dto.deleteItem;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class DeleteItemRes {

    private Long itemNo;
    private String message;

    // 삭제 성공 시 바로 쓸 수 있는 정적 팩토리 메서드
    public static DeleteItemRes success(Long itemNo) {
        return DeleteItemRes.builder()
                .itemNo(itemNo)
                .message("상품이 정상적으로 삭제되었습니다.")
                .build();
    }

    // ✅ 삭제 실패나 다른 상황에 맞는 추가 팩토리도 가능
    public static DeleteItemRes fail(Long itemNo, String reason) {
        return DeleteItemRes.builder()
                .itemNo(itemNo)
                .message("삭제 실패: " + reason)
                .build();
    }
}
