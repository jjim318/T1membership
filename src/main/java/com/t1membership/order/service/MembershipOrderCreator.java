package com.t1membership.order.service;

import com.t1membership.item.constant.ItemCategory;
import com.t1membership.item.constant.MembershipAllowedType;
import com.t1membership.item.constant.MembershipPayType;
import com.t1membership.item.domain.ItemEntity;
import com.t1membership.item.repository.ItemRepository;
import com.t1membership.member.domain.MemberEntity;
import com.t1membership.member.repository.MemberRepository;
import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.user.CreateMembershipOrderReq;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class MembershipOrderCreator implements OrderCreator<CreateMembershipOrderReq> {
    private final MemberRepository memberRepository;
    private final ItemRepository itemRepository;
    //멤버쉽 생성 세부 구현체
    //**Creator는 생성(Create)**에만 집중
    //→ 타입별 분기 + 스냅샷 생성 + 금액 계산 같은 복잡한 시나리오만 따로 뺀 것
    //트랜잭션은 Service 계층에서 걸기
    //→ Creator는 “로직만” 담당, 트랜잭션 경계는 Service가 관리

    /**
     * 멤버십 주문 생성
     * - 프론트에서 오는 planCode는 "T1-2025-MONTHLY" 같은 마케팅 코드 그대로 사용
     * - 여기서 planCode + autoRenew 값을 보고 MembershipPayType 으로 해석
     * - ItemEntity.membership_* 필드를 활용해 가격/정책 계산
     */
    @Override
    public OrderEntity create(String memberEmail, CreateMembershipOrderReq req) {

        // ============================
        // 1) 회원 조회
        // ============================
        MemberEntity member = memberRepository.findByMemberEmail(memberEmail)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원 정보를 찾을 수 없습니다."));

        // ============================
        // 2) planCode(String) + autoRenew → MembershipPayType 으로 해석
        //    - 예: "T1-2025-MONTHLY" → MONTHLY
        //    - autoRenew = true 이면 RECURRING
        //      (형님 룰: 월 정기 구독)
        //    - autoRenew = false 인 경우,
        //      코드 안에 YEARLY / MONTHLY / ONE 같은 키워드를 보고 분기
        // ============================
        MembershipPayType reqPayType = resolvePayTypeFromPlanCode(
                req.getPlanCode(),
                req.isAutoRenew()
        );

        // ============================
        // 3) 멤버십 Item 조회
        //    - membershipPayType + ItemCategory.MEMBERSHIP 로 조회
        //      (ItemEntity에 이미 있는 필드를 활용)
        // ============================
        ItemEntity membershipItem = itemRepository
                .findByMembershipPayTypeAndItemCategory(
                        reqPayType,
                        ItemCategory.MEMBERSHIP
                )
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "멤버십 상품을 찾을 수 없습니다."));

        // 카테고리 2중 체크
        if (membershipItem.getItemCategory() != ItemCategory.MEMBERSHIP) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MEMBERSHIP 상품이 아닙니다.");
        }

        // ============================
        // 4) 멤버십 허용 정책 검증
        //    MembershipAllowedType : ONE_TIME_ONLY / SUBSCRIPTION_ONLY / BOTH
        // ============================
        MembershipAllowedType allowed = membershipItem.getMembershipAllowedType();

        // 단건만 허용인데 정기/연간 요청이 들어온 경우
        if (allowed == MembershipAllowedType.ONE_TIME_ONLY &&
                (reqPayType == MembershipPayType.RECURRING || reqPayType == MembershipPayType.YEARLY)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 멤버십은 단건 결제만 허용됩니다.");
        }

        // 정기만 허용인데 단건 요청이 들어온 경우
        if (allowed == MembershipAllowedType.RECURRING_ONLY &&
                reqPayType == MembershipPayType.ONE_TIME) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 멤버십은 정기결제만 가능합니다.");
        }

        // ============================
        // 5) 가격 계산
        //    - ItemEntity.membership_*_price 필드 활용
        // ============================
        BigDecimal totalPrice = computeMembershipPrice(membershipItem, reqPayType, req.getMonths());

        // ============================
        // 6) 이용 기간 계산
        // ============================
        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = startDate.plusMonths(req.getMonths());

        // ============================
        // 7) 배송 정보 기본값 세팅 (멤버십은 실제 배송 없음)
        // ============================

        // 멤버 프로필 기반으로 채우거나, 없으면 더미 값
        String receiverName = (req.getMemberName() != null && !req.getMemberName().isBlank())
                ? req.getMemberName()
                : member.getMemberName();  // 멤버십 이름 그대로 사용
        String receiverPhone = (req.getMemberPhone() != null && !req.getMemberPhone().isBlank())
                ? req.getMemberPhone()
                : member.getMemberPhone(); // 멤버십 폰 그대로

        // DB에서 NOT NULL 제약 걸려있으니까 절대 null 안 나가게 처리
        String receiverAddress = "멤버십 상품 (배송 주소 없음)";
        String receiverDetailAddress = "";
        String receiverZipCode = "00000";
        String memo = "멤버십 결제 - 배송 없음";

        // ============================
        // 8) 주문 엔티티 생성 (스냅샷 저장)
        // ============================
        OrderEntity order = OrderEntity.builder()
                .member(member)
                .orderStatus(OrderStatus.PAYMENT_PENDING)
                .orderTotalPrice(totalPrice)

                // 멤버십 스냅샷
                .membershipPlanCode(req.getPlanCode())
                .membershipMonths(req.getMonths())
                .membershipStartDate(startDate)
                .membershipEndDate(endDate)
                .membershipPayType(reqPayType)
                .membershipMemberName(req.getMemberName())
                .membershipMemberBirth(req.getMemberBirth())
                .membershipMemberPhone(req.getMemberPhone())
                .autoRenew(req.isAutoRenew())

                // 🔥 여기 추가: 배송 정보 NOT NULL 막기
                .receiverName(receiverName)
                .receiverPhone(receiverPhone)
                .receiverAddress(receiverAddress)
                .receiverDetailAddress(receiverDetailAddress)
                .receiverZipCode(receiverZipCode)
                .memo(memo)

                .build();

        // ============================
        // 9) 주문-아이템 스냅샷
        // ============================
        OrderItemEntity orderItem = OrderItemEntity.builder()
                .order(order)
                .item(membershipItem)
                .itemNameSnapshot(membershipItem.getItemName())
                .itemCategorySnapshot(membershipItem.getItemCategory())
                .itemPriceSnapshot(totalPrice)  // 멤버십은 한 줄짜리라 totalPrice를 스냅샷으로 사용
                .priceAtOrder(totalPrice)
                .quantity(1)
                .build();

        if (order.getOrderItems() != null) {
            order.addItem(orderItem);
        }

        return order;
    }

    /**
     * planCode(마케팅 코드) + autoRenew → MembershipPayType 해석
     * 형님 코드 예: "T1-2025-MONTHLY"
     */
    private MembershipPayType resolvePayTypeFromPlanCode(String planCode, boolean autoRenew) {

        if (planCode == null || planCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "멤버십 플랜 코드가 비어 있습니다.");
        }

        String upper = planCode.toUpperCase();

        // 1) autoRenew = true → 무조건 RECURRING (월 정기 구독 룰)
        if (autoRenew) {
            return MembershipPayType.RECURRING;
        }

        // 2) 코드 안에 YEAR / ANNUAL / YEARLY 포함 → 연간 결제
        if (upper.contains("YEAR")) {
            return MembershipPayType.YEARLY;
        }

        // 3) 코드 안에 MONTH / MONTHLY 포함 → 월 단건 (혹은 기간형)
        if (upper.contains("MONTH")) {
            return MembershipPayType.ONE_TIME;
        }

        // 4) 그 외는 일단 ONE_TIME 으로 처리
        //    (나중에 코드 패턴 늘어나면 여기서 추가 분기)
        return MembershipPayType.ONE_TIME;
    }

    /**
     * 멤버십 가격 계산
     * - ItemEntity.membership_*_price 필드를 우선 사용
     * - 값이 없으면 itemPrice 를 fallback 으로 사용
     */
    private BigDecimal computeMembershipPrice(ItemEntity item,
                                              MembershipPayType payType,
                                              Integer months) {

        if (months == null || months < 1) {
            months = 1;
        }

        // 기본 단가: membership_*_price 가 없을 때 fallback 으로 쓸 값
        // (지금 형님 DB는 item_price 만 채워져 있으니까 이걸 많이 쓰게 될 거)
        BigDecimal baseItemPrice = item.getItemPrice() != null
                ? item.getItemPrice()
                : BigDecimal.ZERO;

        switch (payType) {
            case RECURRING -> {
                // 정기결제: membership_monthly_price 우선
                Integer monthly = item.getMembershipMonthlyPrice();
                BigDecimal monthlyPrice;

                if (monthly != null) {
                    monthlyPrice = BigDecimal.valueOf(monthly.longValue());
                } else {
                    // 설정 안 돼 있으면 item_price 사용
                    monthlyPrice = baseItemPrice;
                }

                return monthlyPrice.multiply(BigDecimal.valueOf(months));
            }

            case YEARLY -> {
                // 연간 결제: membership_yearly_price 우선
                Integer yearly = item.getMembershipYearlyPrice();
                if (yearly != null) {
                    return BigDecimal.valueOf(yearly.longValue());
                }

                // 설정 안 돼 있으면
                // 1) item_price 그대로 1년 가격으로 쓰거나
                // 2) months 기준으로 곱해서 쓰기
                // 형님이 예전에 "item_price 를 월 구독료"라고 보셨으니까,
                // 여기서는 item_price * months 로 맞춰놓을게요.
                return baseItemPrice.multiply(BigDecimal.valueOf(months));
            }

            case ONE_TIME -> {
                // 단건 결제: membership_one_time_price 우선
                Integer oneTime = item.getMembershipOneTimePrice();
                if (oneTime != null) {
                    return BigDecimal.valueOf(oneTime.longValue());
                }

                // 🔥 지금 형님은 membership_one_time_price 를 안 쓰고 있을 가능성이 높으니까,
                // 설정 안 돼 있으면 "item_price * months" 로 계산
                return baseItemPrice.multiply(BigDecimal.valueOf(months));
            }

            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "지원하지 않는 멤버십 결제 타입입니다.");
        }
    }
}
