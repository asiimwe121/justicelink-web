package lcdjp.security;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RecaptchaService {

    private static final Logger log = LoggerFactory.getLogger(RecaptchaService.class);
    private static final String DEFAULT_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
    private static final Duration VERIFY_TIMEOUT = Duration.ofSeconds(8);

    @Value("${app.recaptcha.secret-key:}")
    private String secretKey;

    @Value("${app.recaptcha.site-key:}")
    private String siteKey;

    @Value("${app.recaptcha.verify-url:" + DEFAULT_VERIFY_URL + "}")
    private String verifyUrl = DEFAULT_VERIFY_URL;

    /**
     * What to do when Google cannot be reached (timeouts, 5xx, circuit open). Default false: refuse, as
     * before. True lets people through during a Google outage, which weakens bot protection while it lasts.
     * A refusal from Google (bad secret, bad token) is never treated as an outage.
     */
    @Value("${app.recaptcha.fail-open-on-outage:false}")
    private boolean failOpenOnOutage;

    // No retries: a reCAPTCHA token is single-use, so a repeated call would be refused as a duplicate.
    private OutboundHttp http = new OutboundHttp("recaptcha", OutboundGuard.noRetry("recaptcha"));

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Test hook. */
    void setHttp(OutboundHttp http) {
        this.http = http;
    }

    public boolean isConfigured() {
        return isSet(secretKey) && isSet(siteKey);
    }

    private boolean isSet(String value) {
        return value != null && !value.isEmpty() && !value.startsWith("${");
    }

    public String getSiteKey() {
        return siteKey;
    }

    public boolean verify(String token, String remoteIp) {
        if (!isConfigured()) {
            return true;
        }
        if (token == null || token.isBlank()) {
            return false;
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("secret", secretKey);
        form.put("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            form.put("remoteip", remoteIp);
        }

        try {
            OutboundHttp.Response response = http.postForm(verifyUrl, Map.of("Accept", "application/json"), form, VERIFY_TIMEOUT);
            JsonNode node = objectMapper.readTree(response.body());
            boolean success = node.path("success").asBoolean(false);
            if (!success) {
                log.info("❌ reCAPTCHA verification failed: {}", node.path("error-codes"));
            }
            return success;
        } catch (ProviderRejectedException e) {
            // Google is up and said no (for example a wrong secret key): this is not an outage.
            log.error("❌ reCAPTCHA siteverify refused the request (HTTP {})", e.getStatus());
            return false;
        } catch (Exception e) {
            if (failOpenOnOutage) {
                log.warn("⚠️ reCAPTCHA unreachable ({}); letting the request through because fail-open-on-outage is on",
                        e.getMessage());
                return true;
            }
            log.error("❌ reCAPTCHA siteverify call failed: {}", e.getMessage());
            return false;
        }
    }
}
