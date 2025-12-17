package com.t1membership.pay.repository;

import com.t1membership.pay.domain.TossPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TossPaymentRepository extends JpaRepository<TossPaymentEntity, Long> {
    boolean existsByTossPaymentKey(String tossPaymentKey);
    Optional<TossPaymentEntity> findByOrderTossId(String orderTossId);
}

