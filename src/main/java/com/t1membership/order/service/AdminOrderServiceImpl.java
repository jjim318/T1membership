package com.t1membership.order.service;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.dto.req.admin.AdminUpdateOrderAddressReq;
import com.t1membership.order.dto.req.admin.AdminUpdateOrderStatusReq;
import com.t1membership.order.dto.req.common.CancelOrderReq;
import com.t1membership.order.dto.res.admin.AdminDetailOrderRes;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.common.UpdateOrderAddressRes;
import com.t1membership.order.repository.OrderRepository;
import com.t1membership.pay.service.TossPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminOrderServiceImpl implements AdminOrderService {
    private final OrderRepository orderRepository;
    private final TossPaymentService tossPaymentService;
    //관리자용 주문 서비스 구현체

    //관리자 취소
    @Override
    @Transactional
    public AdminDetailOrderRes cancelOrder(CancelOrderReq req) {

        // 1) 어떤 주문을 취소할지 조회
        OrderEntity order = orderRepository.findByIdFetchItems(req.getOrderNo())
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));

        // 2) 이미 완전히 취소/배송 완료된 주문이면 막기
        if (order.getOrderStatus() == OrderStatus.CANCELED
                || order.getOrderStatus() == OrderStatus.DELIVERED
                || order.getOrderStatus() == OrderStatus.RETURNED
                || order.getOrderStatus() == OrderStatus.REFUNDED) {
            // 이미 완결 상태인 주문은 취소 불가
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "이미 취소되었거나 배송 완료된 주문입니다."
            );
        }

        // 3) ★ 나중에 Toss 환불 붙일 자리
        //    - 현재 형님 말로는 "환불 로직이 아직 없다" → 실제 PG 호출은 나중으로 미룸
        //    - 전체 취소/부분 취소에 따라 전체 환불/부분 환불을 여기서 호출하면 됨.
        // if (order.getOrderStatus() == OrderStatus.PAID
        //         || order.getOrderStatus() == OrderStatus.SHIPMENT_READY
        //         || order.getOrderStatus() == OrderStatus.SHIPPED) {
        //
        //     if (req.getOrderItemNos() == null || req.getOrderItemNos().isEmpty()) {
        //         // 전체 취소 + 전체 환불
        //         tossPaymentService.cancelPaymentByAdmin(order, req.getReason());
        //     } else {
        //         // 부분 취소 + 부분 환불
        //         tossPaymentService.partialCancelPaymentByAdmin(order, req.getOrderItemNos(), req.getReason());
        //     }
        // }

        // 4) 실제 주문/재고 상태 변경 (도메인 메서드 사용)
        if (req.getOrderItemNos() == null || req.getOrderItemNos().isEmpty()) {
            // ✅ 전체 취소: 주문에 속한 모든 OrderItem 재고 롤백 + 주문 상태 CANCELED
            order.cancelAllByAdmin();
        } else {
            // ✅ 부분 취소: 선택한 OrderItem만 재고 롤백 + 주문 상태 적절히 변경(예: PARTIALLY_CANCELED)
            order.cancelPartiallyByAdmin(req.getOrderItemNos());
        }

        // 5) 관리자 상세 응답 DTO로 변환해서 반환
        return AdminDetailOrderRes.from(order);
    }
    // ================== 4) 배송지 변경 ==================
    @Override
    @Transactional
    public UpdateOrderAddressRes updateAddress(AdminUpdateOrderAddressReq req) {

        // 1) 주문 조회 (배송지 바꿀 대상)
        OrderEntity order = orderRepository.findById(req.getOrderNo())
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));

        // 2) 상태별로 배송지 변경 허용 여부 체크
        //    - 보통: 주문 접수/결제 완료/배송 준비 단계까지만 변경 허용
        //    - 이미 배송 중/배송 완료면 변경 불가
        OrderStatus status = order.getOrderStatus();
        if (status == OrderStatus.SHIPPED
                || status == OrderStatus.DELIVERED
                || status == OrderStatus.CANCELED
                || status == OrderStatus.RETURNED
                || status == OrderStatus.REFUNDED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "현재 상태에서는 배송지 변경이 불가능합니다."
            );
        }

        // 3) null 이 아닌 필드만 선택적으로 업데이트 (부분 수정 지원)
        //    → 프론트에서 전달 안 한 필드는 기존 값 유지
        if (req.getReceiverName() != null && !req.getReceiverName().isBlank()) {
            order.setReceiverName(req.getReceiverName());
        }
        if (req.getReceiverPhone() != null && !req.getReceiverPhone().isBlank()) {
            order.setReceiverPhone(req.getReceiverPhone());
        }
        if (req.getReceiverAddress() != null && !req.getReceiverAddress().isBlank()) {
            order.setReceiverAddress(req.getReceiverAddress());
        }
        if (req.getReceiverDetailAddress() != null && !req.getReceiverDetailAddress().isBlank()) {
            order.setReceiverDetailAddress(req.getReceiverDetailAddress());
        }
        if (req.getReceiverZipCode() != null && !req.getReceiverZipCode().isBlank()) {
            order.setReceiverZipCode(req.getReceiverZipCode());
        }
        if (req.getMemo() != null) { // 메모는 공백도 유효할 수 있으니 null만 체크
            order.setMemo(req.getMemo());
        }

        // 4) updatedAt 같은 값 관리하고 있으면 여기서 갱신
        //    ex) order.touchUpdatedAt(); 혹은 order.setLatestDate(LocalDateTime.now());

        // 5) 트랜잭션 끝날 때 JPA 가 flush 하면서 업데이트 반영
        return UpdateOrderAddressRes.from(order);
    }

    // ================== 5) 주문 상태 변경 ==================
    @Override
    @Transactional
    public AdminDetailOrderRes updateStatus(AdminUpdateOrderStatusReq req) {

        // 1) 주문 조회
        OrderEntity order = orderRepository.findByIdFetchItems(req.getOrderNo())
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));

        OrderStatus current = order.getOrderStatus();
        OrderStatus target = req.getOrderStatus();

        // 2) 이미 끝난 주문이면 상태 바꾸지 못하게 막기
        if (current == OrderStatus.CANCELED
                || current == OrderStatus.DELIVERED
                || current == OrderStatus.RETURNED
                || current == OrderStatus.REFUNDED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "이미 완료(취소/배송완료/반품/환불)된 주문의 상태는 변경할 수 없습니다."
            );
        }

        // 3) 상태 전이 규칙 간단히 예시로 구현
        //    - 실제로는 비즈니스 규칙에 맞게 더 타이트하게 걸어도 됨
        switch (target) {
            case SHIPMENT_READY, SHIPPED, DELIVERED, CANCELED -> {
                // TODO: 필요하면 여기서 "current -> target" 허용 여부를 더 세밀하게 체크
                //  ex) current == PAID 인 경우에만 SHIPMENT_READY 허용 등
            }
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "관리자가 직접 설정할 수 없는 상태입니다: " + target
            );
        }

        // ★ 여기서도 PG(환불) 관련 로직을 연결할 수 있음
        //    - target == CANCELED 이고 결제 완료 상태면, cancelOrder 와 다른 정책일 수도 있음

        // 4) 실제 상태 변경
        order.setOrderStatus(target);

        // 5) updatedAt 갱신 등 추가 처리
        // order.setLatestDate(LocalDateTime.now());

        // 6) 응답 DTO로 변환
        return AdminDetailOrderRes.from(order);
    }

}
