package lcdjp.common;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ApiErrorsTest {

    @Test
    void unexpectedFailureIsA500WithReferenceId() {
        ResponseEntity<Map<String, Object>> res = ApiErrors.serverError(ApiErrorsTest.class, new RuntimeException("db down"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, res.getStatusCode());
        assertEquals(ApiErrors.DEFAULT_MESSAGE, res.getBody().get("error"));
        assertEquals(8, String.valueOf(res.getBody().get("referenceId")).length());
    }

    @Test
    void customMessageIsUsedAndInternalDetailsAreNotLeaked() {
        ResponseEntity<Map<String, Object>> res =
                ApiErrors.serverError(ApiErrorsTest.class, new RuntimeException("secret SQL detail"), "Failed to save document");

        assertEquals("Failed to save document", res.getBody().get("error"));
        assertFalse(res.getBody().toString().contains("secret SQL detail"));
    }
}
