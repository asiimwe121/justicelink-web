package lcdjp.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitingFilterTest {

    @Test
    void numericIdsShareOneBucket() {
        assertEquals(RateLimitingFilter.routeKey("/api/cases/1"), RateLimitingFilter.routeKey("/api/cases/98765"));
        assertEquals("/api/cases/{id}", RateLimitingFilter.routeKey("/api/cases/42"));
    }

    @Test
    void referencesAndUuidsShareOneBucket() {
        assertEquals("/api/cases/{id}/messages", RateLimitingFilter.routeKey("/api/cases/CASE-2026-0007/messages"));
        assertEquals("/api/documents/{id}",
                RateLimitingFilter.routeKey("/api/documents/123e4567-e89b-12d3-a456-426614174000"));
    }

    @Test
    void plainRouteNamesAreKept() {
        assertEquals("/api/auth/login", RateLimitingFilter.routeKey("/api/auth/login"));
        assertEquals("/api/v1/health", RateLimitingFilter.routeKey("/api/v1/health"));
    }

    @Test
    void rootAndEmptyPathsAreSafe() {
        assertEquals("/", RateLimitingFilter.routeKey("/"));
        assertEquals("/", RateLimitingFilter.routeKey(""));
        assertEquals("/", RateLimitingFilter.routeKey(null));
    }

    @Test
    void deepPathsAreCappedSoTheKeySpaceStaysBounded() {
        String key = RateLimitingFilter.routeKey("/a/b/c/d/e/f/g/h/i/j/k");
        assertEquals("/a/b/c/d/e/f/g/h", key);
    }
}
