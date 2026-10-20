package lcdjp.notification;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import lcdjp.common.TransientProviderException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(EmailService.class);

    @Value("${brevo.api.url:https://api.brevo.com/v3/smtp/email}")
    private String brevoEndpoint;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${app.base-url:https://justicelinkug.org}")
    private String appBaseUrl;

    @Value("${brevo.sender.name:JusticeLink Uganda}")
    private String senderName;

    /** Each attempt gives up after this long (three attempts of 15s plus backoff used to hold a request thread 45s+). */
    private static final Duration ATTEMPT_TIMEOUT = Duration.ofSeconds(8);
    private static final long RETRY_BACKOFF_MILLIS = 500;

    /**
     * No new attempt starts once about this much time has passed. Checked between attempts, not during
     * one, so the worst case is a little over this plus one attempt timeout. Zero means "no time left":
     * the first failure is final.
     */
    @Value("${brevo.retry-budget-ms:12000}")
    private long retryBudgetMillis = 12_000L;

    // Up to 3 attempts with jittered backoff, plus a circuit breaker so a Brevo outage is not waited on by every request.
    // A 4xx (for example a mistyped address) is a rejection of that one email: never retried, never opens the circuit.
    private final OutboundGuard guard = OutboundGuard.withRetries("brevo-email", RETRY_BACKOFF_MILLIS);
    private final OutboundHttp http = new OutboundHttp("brevo-email", guard);

    public void sendEmail(String to, String subject, String body) throws IOException {
        sendEmailFrom(this.senderEmail, this.senderName, to, subject, body);
    }

    public void sendEmailFrom(String fromEmail, String fromName, String to, String subject, String body)
            throws IOException {
        Map<String, Object> sender = new LinkedHashMap<>();
        sender.put("name", fromName);
        sender.put("email", fromEmail);

        Map<String, Object> recipient = new LinkedHashMap<>();
        recipient.put("email", to);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sender", sender);
        if (!java.util.Objects.equals(fromEmail, this.senderEmail)) {
            payload.put("replyTo", new LinkedHashMap<>(sender));
        }
        payload.put("to", List.of(recipient));
        payload.put("subject", subject);
        payload.put("htmlContent", EmailTemplate.wrap(this.appBaseUrl, body));

        String requestBody;
        try {
            requestBody = OBJECT_MAPPER.writeValueAsString(payload);
        } catch (IOException ex) {
            logger.error("Email error: failed to build Brevo request body - " + ex.getMessage());
            throw ex;
        }

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("accept", "application/json");
        headers.put("api-key", this.brevoApiKey);

        try {
            http.postJson(this.brevoEndpoint, headers, requestBody, ATTEMPT_TIMEOUT, Math.max(1L, retryBudgetMillis));
            logger.info("Brevo accepted the email");
        } catch (ProviderRejectedException ex) {
            // Brevo is up but refused this email (bad address, bad key...). Surface it as before.
            throw new RuntimeException("Brevo rejected the email (HTTP " + ex.getStatus() + "): " + ex.getBody(), ex);
        } catch (TransientProviderException ex) {
            // Still failing after the allowed attempts.
            throw new RuntimeException("Brevo rejected the email (HTTP " + ex.getStatus() + "): " + ex.getBody(), ex);
        } catch (IOException | RuntimeException ex) {
            logger.error("Email error: " + ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            throw new IOException(ex.getMessage(), ex);
        }
    }
}
