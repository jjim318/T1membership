package com.t1membership.order.service;

import com.t1membership.order.constant.OrderStatus;
import com.t1membership.order.domain.OrderEntity;
import com.t1membership.order.domain.OrderItemEntity;
import com.t1membership.order.dto.req.admin.AdminSearchOrderReq;
import com.t1membership.order.dto.res.admin.AdminDetailOrderRes;
import com.t1membership.order.dto.res.common.SummaryOrderRes;
import com.t1membership.order.dto.res.user.UserDetailOrderRes;
import com.t1membership.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderQueryService {

    private final OrderRepository orderRepository;

    //내 주문 목록 조회 (회원
    //loginEmail 은 반드시 SecurityContext / @AuthenticationPrincipal 에서 받은 값만 사용
    public Page<SummaryOrderRes> getMyOrders(String memberEmail, Pageable pageable) {
        // ✅ 최신순 정렬까지 같이 하고 싶으면 Repository 메서드를 바꾸는 게 정석
        // 지금은 pageable sort로 처리 가능하게 해두고, 컨트롤러에서 sort=createdDate,desc 넣으면 됩니다.
        Page<OrderEntity> page = orderRepository.findByMember_MemberEmail(memberEmail, pageable);

        // 🔥 핵심: 내 주문도 SummaryOrderRes.from()을 타게 만든다
        return page.map(SummaryOrderRes::from);
    }

    //관리자용 주문 목록 조회 (전체 페이징
    //관리자 권한 체크는 Controller / SecurityConfig 에서 ROLE_ADMIN 으로 처리
    public Page<SummaryOrderRes> getAllOrderAdmin(Pageable pageable) {
        Page<OrderEntity> page = orderRepository.findAllByOrderByCreateDateDesc(pageable);
        return page.map(SummaryOrderRes::from);
    }

    //주문 상세조회(회원
    //본인 주문인지 memberEmail + orderNo로 강제 체크
    public UserDetailOrderRes getUserDetail(String memberEmail, Long orderNo) {
        OrderEntity orderEntity = orderRepository.findByOrderNoAndMember_MemberEmail(orderNo,memberEmail)
                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND,"주문을 찾을 수 없습니다"));

    return UserDetailOrderRes.from(orderEntity);
    }

    //관리자용 상세조회
    //권한 체크만 Controller / Security에서 ROLE_ADMIN으로 미리 보장
    public AdminDetailOrderRes getAdminDetail(Long orderNo) {
        OrderEntity orderEntity = orderRepository.findByIdFetchItems(orderNo)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"주문을 찾을 수 없습니다"));
        return AdminDetailOrderRes.from(orderEntity);
    }

    //조건 검색
    public Page<SummaryOrderRes> searchOrders(AdminSearchOrderReq req, Pageable pageable) {
        Page<OrderEntity> page = orderRepository.searchOrders(req, pageable);
        return page.map(SummaryOrderRes::from);
    }
}
