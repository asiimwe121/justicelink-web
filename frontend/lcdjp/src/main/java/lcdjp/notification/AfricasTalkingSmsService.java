package lcdjp.notification;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Primary
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "africastalking")
public class AfricasTalkingSmsService implements SmsService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AfricasTalkingSmsService.class);

    static final String LIVE_URL = "https://api.africastalking.com/version1/messaging";
    static final String SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging";

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http;
    // Circuit breaker only: an SMS must never be sent twice, so no retries here.
    // Refusals (bad credentials, a number the provider will not send to) are ProviderRejectedException:
    // they never count toward opening the circuit, so a few bad numbers cannot switch SMS off for everyone.
    private final OutboundGuard guard = OutboundGuard.noRetry("africastalking-sms");

    private final String username;
    private final String apiKey;
    private final String senderId;
    private final String endpoint;

    public AfricasTalkingSmsService(
            @Value("${app.sms.africastalking.username:}") String username,
            @Value("${app.sms.africastalking.api-key:}") String apiKey,
            @Value("${app.sms.africastalking.sender-id:}") String senderId,
            @Value("${app.sms.africastalking.sandbox:false}") boolean sandbox) {
        this(username, apiKey, senderId, sandbox ? SANDBOX_URL : LIVE_URL,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    AfricasTalkingSmsService(String username, String apiKey, String senderId, String endpoint, HttpClient http) {
        this.username = username == null ? "" : username.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.senderId = senderId == null ? "" : senderId.trim();
        this.endpoint = endpoint;
        this.http = http;
    }

    @PostConstruct
    void requireCredentials() {
        if (username.isEmpty() || apiKey.isEmpty()) {
            throw new IllegalStateException("app.sms.provider=africastalking needs app.sms.africastalking.username "
                    + "and app.sms.africastalking.api-key (set AT_USERNAME and AT_API_KEY).");
        }
        logger.info("SMS provider: Africa's Talking ({}{})", endpoint.contains("sandbox") ? "sandbox" : "live",
                senderId.isEmpty() ? "" : ", sender " + senderId);
    }

    @Override
    public void sendSms(String phoneNumber, String message) throws Exception {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("SMS message is empty");
        }
        SmsContentGuard.requireNeutral(message);
        String to = toInternational(phoneNumber);

        Map<String, String> form = new LinkedHashMap<>();
        form.put("username", username);
        form.put("to", to);
        form.put("message", message);
        if (!senderId.isEmpty()) {
            form.put("from", senderId);
        }
        String body = form.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));

        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(20))
                .header("apiKey", apiKey)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        guard.call(() -> {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 401 || status == 403) {
                throw new ProviderRejectedException("Africa's Talking rejected the credentials (HTTP " + status + ")",
                        status, null);
            }
            if (status < 200 || status >= 300) {
                if (OutboundHttp.isTransient(status)) {
                    // Provider trouble (5xx, 429, 408): this does count toward the circuit.
                    throw new IllegalStateException("Africa's Talking returned HTTP " + status);
                }
                throw new ProviderRejectedException("Africa's Talking refused the request (HTTP " + status + ")",
                        status, null);
            }

            JsonNode recipients = mapper.readTree(response.body()).path("SMSMessageData").path("Recipients");
            if (!recipients.isArray() || recipients.isEmpty()) {
                String summary = mapper.readTree(response.body()).path("SMSMessageData").path("Message").asText("no recipients");
                throw new ProviderRejectedException("Africa's Talking did not accept the message: " + summary);
            }
            for (JsonNode r : recipients) {
                int code = r.path("statusCode").asInt(-1);
                if (code < 100 || code > 102) {
                    throw new ProviderRejectedException("Africa's Talking could not send to " + maskPhone(to)
                            + ": " + r.path("status").asText("unknown error") + " (code " + code + ")");
                }
            }
            logger.info("SMS accepted by Africa's Talking for {}", maskPhone(to));
            return null;
        });
    }

    static String toInternational(String raw) {
        if (raw == null) throw new IllegalArgumentException("Phone number is missing");
        String trimmed = raw.trim();
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.isEmpty()) throw new IllegalArgumentException("Phone number is missing");

        if (trimmed.startsWith("+")) {
            if (digits.length() < 8 || digits.length() > 15) throw new IllegalArgumentException("Phone number is not valid");
            return "+" + digits;
        }
        if (digits.startsWith("00") && digits.length() > 10) {
            return "+" + digits.substring(2);
        }
        if (digits.startsWith("256") && digits.length() == 12) {
            return "+" + digits;
        }
        if (digits.startsWith("0") && digits.length() == 10) {
            return "+256" + digits.substring(1);
        }
        if (digits.length() == 9) {
            return "+256" + digits;
        }
        throw new IllegalArgumentException("Phone number is not valid");
    }

    static String maskPhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        return digits.length() < 4 ? "***" : "***" + digits.substring(digits.length() - 4);
    }
}
