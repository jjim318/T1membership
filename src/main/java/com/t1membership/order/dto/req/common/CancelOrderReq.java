package com.t1membership.order.dto.req.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelOrderReq {//주문 취소
    @NotNull
    private Long orderNo;//주문번호
    @NotBlank
    private String reason;//주문취소 사유

    //null 또는 빈 리스트면 → "전체 취소"
    //값이 들어있으면      → "부분 취소 (해당 orderItem들만)"
    //이 규칙을 서비스에서 사용하게 되므로, 컨트롤러/서비스에서 반드시 이 의미로 사용해야 함
    private List<Long> orderItemNos; // 주문상품번호 리스트
}
