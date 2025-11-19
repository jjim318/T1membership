// TossPaymentService.java
package com.t1membership.pay.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TossPaymentService {

    @Value("${toss.secret-key}")
    private String tossSecretKey; // 반드시 test_sk_... (테스트)

    private final RestTemplate tossrestTemplate;

    /**
     * 1) 결제창 URL 생성 (API 개별 연동)
     * 응답의 checkout URL 키가 환경에 따라 달라질 수 있어
     * checkoutUrl / checkout (string) / checkout.url (object) 모두 대응.
     */
    @Transactional
    public String createPaymentUrl(String orderId, int amount, String orderName) {
        final String url = "https://api.tosspayments.com/v1/payments";

        // Authorization: Basic base64(test_sk_xxx:)
        final String basic = "Basic " + Base64.getEncoder()
                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = createAuthHeaders();

        Map<String, Object> body = Map.of(
                "amount", amount,
                "orderId", orderId,
                "orderName", orderName
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = tossrestTemplate.postForEntity(url, entity, Map.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("결제창 생성 실패: http=" + response.getStatusCode());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) response.getBody();

            String checkoutUrl = extractCheckoutUrl(resBody);
            if (checkoutUrl == null || checkoutUrl.isBlank()) {
                throw new IllegalStateException("결제창 URL을 찾지 못했습니다. 응답=" + resBody);
            }

            log.debug("[Toss] checkoutUrl={}", checkoutUrl);
            return checkoutUrl;

        } catch (HttpStatusCodeException e) {
            // 토스가 내려주는 상세 바디까지 로그로 확인
            String err = e.getResponseBodyAsString();
            throw new IllegalStateException("결제창 생성 오류: http=" + e.getStatusCode() + ", body=" + err, e);
        }
    }

    /**
     * 2) 결제 승인(confirm)
     */
    @Transactional
    public Map<String, Object> confirmPayment(String paymentKey, String orderId, int amount) {
        final String url = "https://api.tosspayments.com/v1/payments/confirm";

        final String basic = "Basic " + Base64.getEncoder()
                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = createAuthHeaders();

        Map<String, Object> body = Map.of(
                "paymentKey", paymentKey,
                "orderId", orderId,
                "amount", amount
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> res = tossrestTemplate.postForEntity(url, entity, Map.class);
            if (!res.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("결제 승인 실패: http=" + res.getStatusCode() + ", body=" + res.getBody());
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
            log.debug("[Toss] confirm OK: {}", resBody);
            return resBody;

        } catch (HttpStatusCodeException e) {
            String err = e.getResponseBodyAsString();
            throw new IllegalStateException("Toss confirm error: http=" + e.getStatusCode() + ", body=" + err, e);
        }
    }
    /**
     * 3) 결제 취소 / 환불
     * - paymentKey 기준 취소
     * - cancelAmount 를 넘기면 부분취소, null 이면 전액취소(형님 정책에 맞게 조절)
     * - 실제 Order 상태 변경, 재고 복구 등은 OrderService 에서 처리
     */
    @Transactional
    public Map<String, Object> cancelPayment(String paymentKey,
                                             Integer cancelAmount,
                                             String cancelReason) {
        // Toss 취소 endpoint: POST /v1/payments/{paymentKey}/cancel
        final String url = "https://api.tosspayments.com/v1/payments/" + paymentKey + "/cancel";

        HttpHeaders headers = createAuthHeaders();

        // body 구성: reason 은 필수, amount 는 정책에 따라
        // 전액 취소만 쓴다면 cancelAmount 없이 reason 만 보내도 됨.
        Map<String, Object> body;
        if (cancelAmount != null && cancelAmount > 0) {
            body = Map.of(
                    "cancelReason", cancelReason,
                    "cancelAmount", cancelAmount
            );
        } else {
            body = Map.of(
                    "cancelReason", cancelReason
            );
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> res = tossrestTemplate.postForEntity(url, entity, Map.class);
            if (!res.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("결제 취소 실패: http=" + res.getStatusCode() + ", body=" + res.getBody());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
            log.debug("[Toss] cancel OK: {}", resBody);
            return resBody;

        } catch (HttpStatusCodeException e) {
            String err = e.getResponseBodyAsString();
            log.error("[Toss] cancel error: http={}, body={}", e.getStatusCode(), err);
            throw new IllegalStateException("Toss cancel error: http=" + e.getStatusCode() + ", body=" + err, e);
        }
    }

    // ---------------- helpers ----------------

    /**
     * Authorization, Content-Type 공통 세팅
     */
    private HttpHeaders createAuthHeaders() {
        final String basic = "Basic " + Base64.getEncoder()
                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, basic);
        return headers;
    }
    /**
     * checkoutUrl / checkout(string) / checkout.url(object) 모두 지원
     */
    @SuppressWarnings("unchecked")
    private String extractCheckoutUrl(Map<String, Object> body) {
        if (body == null) return null;

        Object v1 = body.get("checkoutUrl");
        if (v1 instanceof String s1 && !s1.isBlank()) {
            return s1;
        }

        Object v2 = body.get("checkout");
        if (v2 instanceof String s2 && !s2.isBlank()) {
            return s2;
        }
        if (v2 instanceof Map<?, ?> m) {
            Object u = m.get("url");
            if (u instanceof String s3 && !s3.isBlank()) {
                return s3;
            }
        }

        // 혹시 다른 키로 내려오는 경우 대비(필요 시 확장)
        Object links = body.get("_links");
        if (links instanceof Map<?, ?> lm) {
            Object checkout = lm.get("checkout");
            if (checkout instanceof Map<?, ?> cm) {
                Object href = cm.get("href");
                if (href instanceof String s4 && !s4.isBlank()) {
                    return s4;
                }
            }
        }
        return null;
    }
}