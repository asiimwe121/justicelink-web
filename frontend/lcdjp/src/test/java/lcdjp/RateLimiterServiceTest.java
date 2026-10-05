package lcdjp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimiterServiceTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService(redisTemplate);
    }

    @SuppressWarnings("unchecked")
    private void stubScriptResult(Long count) {
        when(redisTemplate.execute(
                any(DefaultRedisScript.class),
                anyList(),
                any(Object[].class)
        )).thenReturn(count);
    }

    @Test
    void requestsUnderTheLimitAreAllowed() {
        stubScriptResult(1L);
        assertTrue(rateLimiterService.isAllowed("ip:/api/cases", 100, 1));
    }

    @Test
    void requestAtExactlyTheLimitIsStillAllowed() {
        stubScriptResult(100L);
        assertTrue(rateLimiterService.isAllowed("ip:/api/cases", 100, 1));
    }

    @Test
    void requestOverTheLimitIsRejected() {
        stubScriptResult(101L);
        assertFalse(rateLimiterService.isAllowed("ip:/api/cases", 100, 1));
    }

    @Test
    void nullScriptResultFailsClosedNotOpen() {
        stubScriptResult(null);
        assertFalse(rateLimiterService.isAllowed("ip:/api/cases", 100, 1));
    }

    @Test
    void getAvailableTokensReturnsDefaultWhenKeyUnseen() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("ratelimit:ip:/api/cases")).thenReturn(null);

        assertEquals(100L, rateLimiterService.getAvailableTokens("ip:/api/cases"));
    }

    @Test
    void getAvailableTokensSubtractsUsedCount() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("ratelimit:ip:/api/cases")).thenReturn("40");

        assertEquals(60L, rateLimiterService.getAvailableTokens("ip:/api/cases"));
    }

    @Test
    void resetLimitDeletesTheUnderlyingKey() {
        rateLimiterService.resetLimit("ip:/api/cases");
        verify(redisTemplate).delete("ratelimit:ip:/api/cases");
    }
}
