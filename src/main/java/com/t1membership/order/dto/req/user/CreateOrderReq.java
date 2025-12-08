package com.t1membership.order.dto.req.user;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.t1membership.item.constant.ItemCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderReq {
    //최상의 주문 dto (type + payload)
    //여기에서 @JsonTypeInfo나 매핑을 이용해 payload에 들어가도록 설정
    //단일 주문 생성 요청 DTO

    @NotNull
    private ItemCategory type;  // GOODS / MEMBERSHIP / POP

    /**
     * payload 다형성 루트
     * - type=GOODS -> CreateGoodsOrderReq 로 역직렬화
     * - type=MEMBERSHIP -> CreateMembershipOrderReq
     * - type=POP -> CreatePopOrderReq
     */
    @JsonTypeInfo(
            use = JsonTypeInfo.Id.NAME,//type 값을 "문자열 이름"으로 해석
            include = JsonTypeInfo.As.EXTERNAL_PROPERTY,//JSON의 같은 계층에 있는 필드(type)를 보고 결정
            property = "type"//어떤 필드를 보고 결정할지 지정
    )//Jackson에게 "이 payload가 어떤 구체 클래스인지" 알려주는 힌트.
    @JsonSubTypes({
            @JsonSubTypes.Type(value = CreateGoodsOrderReq.class, name = "MD"),
            @JsonSubTypes.Type(value = CreateMembershipOrderReq.class, name = "MEMBERSHIP"),
            @JsonSubTypes.Type(value = CreatePopOrderReq.class, name = "POP")
    })//@JsonTypeInfo에서 지정한 type 값과 실제 클래스 매핑 테이블.
    //타입별 DTO를 따로 쓸 수 있어 유효성 검증/필드 분리가 깔끔

    @Valid//payload 객체 안에 있는 필드들까지 재귀적으로 검증
    // CreateGoodsOrderReq 내부의 @NotBlank, @Pattern 같은 것도 같이 체크
    @NotNull
    private Payload payload;

    public interface Payload {}
}
