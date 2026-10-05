package lcdjp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(EmailService.class);

    @Value("${brevo.api.url:https://api.brevo.com/v3/smtp/email}")
    private String brevoEndpoint;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${brevo.sender.name:JusticeLink Uganda}")
    private String senderName;

    private static final int MAX_SEND_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MILLIS = 500;

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
        payload.put("htmlContent", body);

        String requestBody;
        try {
            requestBody = OBJECT_MAPPER.writeValueAsString(payload);
        } catch (IOException ex) {
            logger.error("Email error: failed to build Brevo request body - " + ex.getMessage());
            throw ex;
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(this.brevoEndpoint))
                .timeout(Duration.ofSeconds(15))
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .header("api-key", this.brevoApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        IOException lastIoFailure = null;
        for (int attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
            try {
                HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

                int statusCode = response.statusCode();
                String responseBody = response.body() == null ? "" : response.body();
                logger.info("Brevo response - Status: " + statusCode);

                if (statusCode >= 200 && statusCode < 300) {
                    return;
                }

                String rejection = "Brevo rejected the email (HTTP " + statusCode + "): " + responseBody;
                if (statusCode < 500 || attempt == MAX_SEND_ATTEMPTS) {
                    throw new RuntimeException(rejection);
                }
                logger.warn("Email warning: retrying after " + rejection
                        + " (attempt " + attempt + "/" + MAX_SEND_ATTEMPTS + ")");
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                logger.error("Email error: request interrupted - " + ex.getMessage());
                throw new IOException("Brevo request was interrupted", ex);
            } catch (IOException ex) {
                lastIoFailure = ex;
                if (attempt == MAX_SEND_ATTEMPTS) {
                    logger.error("Email error: " + ex.getMessage());
                    throw ex;
                }
                logger.warn("Email warning: retrying after network failure - " + ex.getMessage()
                        + " (attempt " + attempt + "/" + MAX_SEND_ATTEMPTS + ")");
            }

            try {
                Thread.sleep(RETRY_BACKOFF_MILLIS * attempt);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new IOException("Brevo retry was interrupted", lastIoFailure != null ? lastIoFailure : ie);
            }
        }
    }
}