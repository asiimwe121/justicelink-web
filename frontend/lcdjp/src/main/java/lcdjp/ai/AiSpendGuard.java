package lcdjp.ai;

import lcdjp.common.RateLimiterService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Daily ceiling on what the paid AI provider can cost, independent of how many requests it took to get there.
 *
 * Request-count limits alone do not bound spend (a request can be 10 tokens or 10,000). Before every provider call we
 * add a conservative estimate (prompt chars / 3, plus the max completion size) to a per-UTC-day counter in Redis and
 * refuse the call once the budget is exhausted. The counter fails closed: if Redis is down, paid calls stop.
 *
 * Configure with app.ai.daily-token-budget (0 disables the cap; default 2,000,000 tokens/day).
 */
@Service
public class AiSpendGuard {

    private static final Logger log = LoggerFactory.getLogger(AiSpendGuard.class);

    private final RateLimiterService limiter;
    private final long dailyTokenBudget;

    public AiSpendGuard(RateLimiterService limiter,
                        @Value("${app.ai.daily-token-budget:2000000}") long dailyTokenBudget) {
        this.limiter = limiter;
        this.dailyTokenBudget = dailyTokenBudget;
    }

    /** Rough token estimate for a prompt: ~3 chars per token is deliberately pessimistic for English and Luganda. */
    static long estimateTokens(int promptChars, int maxCompletionTokens) {
        return Math.max(1, promptChars / 3) + Math.max(0, maxCompletionTokens);
    }

    /** @return true if the call may proceed (and its estimated cost has been reserved). */
    public boolean tryReserve(int promptChars, int maxCompletionTokens) {
        long cost = estimateTokens(promptChars, maxCompletionTokens);
        String key = "ai-spend:" + LocalDate.now(ZoneOffset.UTC);
        // 25h window so the key outlives the UTC day it is named for, then expires on its own.
        boolean ok = limiter.tryConsume(key, cost, dailyTokenBudget, 25 * 60);
        if (!ok) {
            log.warn("[AI] Daily token budget ({}) reached or limiter unavailable; refusing provider call", dailyTokenBudget);
        }
        return ok;
    }
}
