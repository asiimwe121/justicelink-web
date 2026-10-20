package lcdjp.common;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleValidationExceptions_returns400WithPerFieldMessages() {
        FieldError fieldError = new FieldError("registrationRequest", "email", "Email must be a valid address");
        BindingResult bindingResult = mock(BindingResult.class);
        when(bindingResult.getAllErrors()).thenReturn(List.of(fieldError));
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<Map<String, Object>> response = handler.handleValidationExceptions(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, String> errors = (Map<String, String>) response.getBody().get("validationErrors");
        assertEquals("Email must be a valid address", errors.get("email"));
    }

    @Test
    void handleRateLimitExceeded_returns429WithRetryAfterHeaderAndBody() {
        RateLimitExceededException ex = new RateLimitExceededException("too many login attempts", 42L);

        ResponseEntity<Map<String, Object>> response = handler.handleRateLimitExceeded(ex);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("42", response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        assertEquals(42L, response.getBody().get("retryAfterSeconds"));
        assertEquals("Rate limit exceeded. Please try again later.", response.getBody().get("message"));
    }

    @Test
    void handleResourceNotFound_returns404WithMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Case 123 not found");

        ResponseEntity<Map<String, Object>> response = handler.handleResourceNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Case 123 not found", response.getBody().get("message"));
    }

    @Test
    void handleIllegalArgumentException_returns400_hidesInternalMessage_andIncludesReferenceId() {
        IllegalArgumentException ex = new IllegalArgumentException("Duplicate entry 'jdoe' for key 'users.username_UNIQUE'");

        ResponseEntity<Map<String, Object>> response = handler.handleIllegalArgumentException(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        String message = (String) response.getBody().get("message");
        assertFalse(message.contains("users.username_UNIQUE"), "raw exception detail must not reach the client");
        assertNotNull(response.getBody().get("referenceId"));
    }

    @Test
    void aRuntimeExceptionThatIsNotIllegalArgument_isNotHandledAsABadRequest() {
        RuntimeException dbFailure = new RuntimeException("Connection to jdbc:mysql://localhost:3307/lcdjp refused");

        ResponseEntity<Map<String, Object>> response = handler.handleGenericException(dbFailure);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertFalse(dbFailure instanceof IllegalArgumentException);
    }

    @Test
    void handleGenericException_returns500_hidesInternalMessage_andIncludesReferenceId() {
        Exception ex = new IllegalStateException("Connection to jdbc:mysql://localhost:3307/lcdjp refused");

        ResponseEntity<Map<String, Object>> response = handler.handleGenericException(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        String message = (String) response.getBody().get("message");
        assertFalse(message.contains("jdbc:mysql"), "raw exception detail must not reach the client");
        assertNotNull(response.getBody().get("referenceId"));
    }

    @Test
    void handleIllegalArgumentException_referenceIdsAreUniquePerCall() {
        IllegalArgumentException ex1 = new IllegalArgumentException("boom 1");
        IllegalArgumentException ex2 = new IllegalArgumentException("boom 2");

        String ref1 = (String) handler.handleIllegalArgumentException(ex1).getBody().get("referenceId");
        String ref2 = (String) handler.handleIllegalArgumentException(ex2).getBody().get("referenceId");

        assertNotEquals(ref1, ref2);
    }
}
