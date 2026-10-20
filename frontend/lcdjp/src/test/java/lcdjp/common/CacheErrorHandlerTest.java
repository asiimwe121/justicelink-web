package lcdjp.common;

import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CacheErrorHandlerTest {

    @Test
    void redisFailuresAreSwallowedSoTheDatabaseAnswers() {
        CacheErrorHandler handler = new CacheConfig().errorHandler();
        Cache cache = mock(Cache.class);
        when(cache.getName()).thenReturn("statistics");
        RuntimeException down = new RuntimeException("Redis down");

        assertDoesNotThrow(() -> handler.handleCacheGetError(down, cache, "cases"));
        assertDoesNotThrow(() -> handler.handleCachePutError(down, cache, "cases", "v"));
        assertDoesNotThrow(() -> handler.handleCacheEvictError(down, cache, "cases"));
        assertDoesNotThrow(() -> handler.handleCacheClearError(down, cache));
    }
}
