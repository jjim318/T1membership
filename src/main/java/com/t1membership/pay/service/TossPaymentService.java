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
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TossPaymentService {

    @Value("${toss.payments.secret-key:}")
    private String tossSecretKey; // test_sk_... (테스트용 시크릿키)

    @Value("${toss.payments.success-url}")
    private String successUrl;    // 예: http://localhost:3000/pay/toss/success
    @Value("${toss.payments.fail-url}")
    private String failUrl;       // 예: http://localhost:3000/pay/toss/fail

    private final RestTemplate tossrestTemplate;

    /**
     * 1) 결제창 URL 생성
     *
     *  - 토스 결제생성 API /v1/payments 에 맞춰 필수 필드 채워서 호출
     *  - 최소 요구 파라미터 예시:
     *      flowMode : "DEFAULT"  (토스 호스팅 결제창)
     *      method   : "CARD"     (카드/간편결제 통합창)
     *      amount   : 결제 금액 (int)
     *      orderId  : 상점 주문번호
     *      orderName: 주문명
     *      successUrl, failUrl : 리다이렉트 URL
     */
    @Transactional
    public String createPaymentUrl(String orderId, int amount, String orderName) {

        final String url = "https://api.tosspayments.com/v1/payments";

        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("orderId가 비어 있습니다.");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("amount는 0보다 커야 합니다. amount=" + amount);
        }

        HttpHeaders headers = createAuthHeaders();

        // 🔥 토스 문서 기준 결제생성에 필요한 필드들
        Map<String, Object> body = Map.of(
                "flowMode", "DEFAULT",   // 토스 호스팅 결제창
                "method", "CARD",        // 카드/간편결제 통합 (v1에서는 "카드"를 쓰기도 하는데, 최신 문서 기준 "CARD" 사용)
                "amount", amount,
                "orderId", orderId,
                "orderName", orderName,
                "successUrl", successUrl,
                "failUrl", failUrl
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            log.info("[Toss] 결제창 생성 요청: url={}, body={}", url, body);

            ResponseEntity<Map> response =
                    tossrestTemplate.postForEntity(url, entity, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException(
                        "결제창 생성 실패: http=" + response.getStatusCode()
                                + ", body=" + response.getBody()
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) response.getBody();

            String checkoutUrl = extractCheckoutUrl(resBody);
            if (checkoutUrl == null || checkoutUrl.isBlank()) {
                throw new IllegalStateException(
                        "결제창 URL을 찾지 못했습니다. 응답=" + resBody
                );
            }

            log.info("[Toss] checkoutUrl={}", checkoutUrl);
            return checkoutUrl;

        } catch (HttpStatusCodeException e) {
            String err = e.getResponseBodyAsString();
            log.error("[Toss] 결제창 생성 HTTP 오류: http={}, body={}",
                    e.getStatusCode(), err);
            throw new IllegalStateException(
                    "결제창 생성 오류: http=" + e.getStatusCode()
                            + ", body=" + err, e
            );
        }
    }

    // =========================================
    // 2) 결제 승인(confirm)
    // =========================================
    @Transactional
    public Map<String, Object> confirmPayment(String paymentKey, String orderId, int amount) {
        final String url = "https://api.tosspayments.com/v1/payments/confirm";

        HttpHeaders headers = createAuthHeaders();

        Map<String, Object> body = Map.of(
                "paymentKey", paymentKey,
                "orderId", orderId,
                "amount", amount
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("[Toss] 결제 승인 요청: url={}, body={}", url, body);

        try {
            ResponseEntity<Map> res =
                    tossrestTemplate.postForEntity(url, entity, Map.class);

            log.info("[Toss] 결제 승인 응답: status={}, body={}",
                    res.getStatusCode(), res.getBody());

            if (!res.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException(
                        "결제 승인 실패: http=" + res.getStatusCode() +
                                ", body=" + res.getBody()
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
            log.debug("[Toss] confirm OK: {}", resBody);
            return resBody;

        } catch (HttpStatusCodeException e) {
            String err = e.getResponseBodyAsString();
            log.error("[Toss] confirm error: status={}, body={}",
                    e.getStatusCode(), err, e);
            throw new IllegalStateException(
                    "Toss confirm error: http=" + e.getStatusCode() + ", body=" + err,
                    e
            );
        }
    }

    // =========================================
    // 3) 결제 취소 / 환불
    // =========================================
    @Transactional
    public Map<String, Object> cancelPayment(String paymentKey,
                                             Integer cancelAmount,
                                             String cancelReason) {

        final String url = "https://api.tosspayments.com/v1/payments/" + paymentKey + "/cancel";

        HttpHeaders headers = createAuthHeaders();

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

        log.info("[Toss] 결제 취소 요청: url={}, body={}", url, body);

        try {
            ResponseEntity<Map> res =
                    tossrestTemplate.postForEntity(url, entity, Map.class);

            log.info("[Toss] 결제 취소 응답: status={}, body={}",
                    res.getStatusCode(), res.getBody());

            if (!res.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException(
                        "결제 취소 실패: http=" + res.getStatusCode() +
                                ", body=" + res.getBody()
                );
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resBody = (Map<String, Object>) res.getBody();
            log.debug("[Toss] cancel OK: {}", resBody);
            return resBody;

        } catch (HttpStatusCodeException e) {
            String err = e.getResponseBodyAsString();
            log.error("[Toss] cancel error: status={}, body={}",
                    e.getStatusCode(), err, e);
            throw new IllegalStateException(
                    "Toss cancel error: http=" + e.getStatusCode() + ", body=" + err,
                    e
            );
        }
    }

    // =========================================
    // 공통 helper
    // =========================================

    /**
     * Authorization, Content-Type 공통 세팅
     */
    private HttpHeaders createAuthHeaders() {
        // Basic {base64(secretKey:)}
        final String basic = "Basic " + Base64.getEncoder()
                .encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, basic);
        return headers;
    }

    /**
     * checkoutUrl / checkout(string) / checkout.url(object) / _links.checkout.href
     * 여러 케이스 대응
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
