package lcdjp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class RecaptchaService {

    private static final Logger log = LoggerFactory.getLogger(RecaptchaService.class);
    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    @Value("${app.recaptcha.secret-key:}")
    private String secretKey;

    @Value("${app.recaptcha.site-key:}")
    private String siteKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
        try {
            StringBuilder params = new StringBuilder();
            params.append("secret=").append(URLEncoder.encode(secretKey, StandardCharsets.UTF_8));
            params.append("&response=").append(URLEncoder.encode(token, StandardCharsets.UTF_8));
            if (remoteIp != null && !remoteIp.isBlank()) {
                params.append("&remoteip=").append(URLEncoder.encode(remoteIp, StandardCharsets.UTF_8));
            }

            URL url = new URL(VERIFY_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            try (OutputStream os = conn.getOutputStream()) {
                os.write(params.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    status < 400 ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }

            if (status >= 400) {
                log.error("❌ reCAPTCHA siteverify HTTP error {}: {}", status, sb);
                return false;
            }

            JsonNode node = objectMapper.readTree(sb.toString());
            boolean success = node.path("success").asBoolean(false);
            if (!success) {
                log.info("❌ reCAPTCHA verification failed: {}", node.path("error-codes"));
            }
            return success;
        } catch (Exception e) {
            log.error("❌ reCAPTCHA siteverify call failed: {}", e.getMessage());
            return false;
        }
    }
}
