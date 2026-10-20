package lcdjp.common;

import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Response for an unexpected failure inside a controller's own try/catch. It logs the exception with a
 * reference id (so the failure shows up in logs and alerts) and answers 500, not 400: a database or
 * provider fault is not the caller's mistake, and clients should not treat it as bad input.
 * Genuine bad input must be caught separately and answered with 400 before this is reached.
 */
public final class ApiErrors {

    public static final String DEFAULT_MESSAGE = "Request could not be processed. Please try again later.";

    private ApiErrors() {
    }

    public static ResponseEntity<Map<String, Object>> serverError(Class<?> source, Exception e) {
        return serverError(source, e, DEFAULT_MESSAGE);
    }

    public static ResponseEntity<Map<String, Object>> serverError(Class<?> source, Exception e, String message) {
        String ref = UUID.randomUUID().toString().substring(0, 8);
        LoggerFactory.getLogger(source).error("Request failed [ref={}]: {}", ref, e.getMessage(), e);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", message);
        body.put("referenceId", ref);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
