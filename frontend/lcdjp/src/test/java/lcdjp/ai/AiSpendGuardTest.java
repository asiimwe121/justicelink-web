package lcdjp.ai;

import lcdjp.common.RateLimiterService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiSpendGuardTest {

    private final RateLimiterService limiter = mock(RateLimiterService.class);

    @Test
    void estimateIsPromptThirdPlusCompletion() {
        assertEquals(300 + 700, AiSpendGuard.estimateTokens(900, 700));
        assertEquals(1 + 700, AiSpendGuard.estimateTokens(0, 700));
    }

    @Test
    void allowsWhileUnderBudget() {
        when(limiter.tryConsume(startsWith("ai-spend:"), eq(1000L), eq(5000L), anyInt())).thenReturn(true);
        assertTrue(new AiSpendGuard(limiter, 5000).tryReserve(900, 700));
    }

    @Test
    void refusesWhenBudgetExhaustedOrLimiterDown() {
        when(limiter.tryConsume(anyString(), anyLong(), anyLong(), anyInt())).thenReturn(false);
        assertFalse(new AiSpendGuard(limiter, 5000).tryReserve(900, 700));
    }
}
