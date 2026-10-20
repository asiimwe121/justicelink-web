package lcdjp.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private static final int DEFAULT_LIMIT = 100;
    private static final int DEFAULT_DURATION_MINUTES = 1;
    private static final String KEY_PREFIX = "ratelimit:";

    private final StringRedisTemplate redisTemplate;

    private static final DefaultRedisScript<Long> INCR_WITH_EXPIRY_SCRIPT = new DefaultRedisScript<>(
            "local count = redis.call('INCR', KEYS[1]) " +
                    "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end " +
                    "return count",
            Long.class
    );

    @Autowired
    public RateLimiterService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isAllowed(String key) {
        return isAllowed(key, DEFAULT_LIMIT, DEFAULT_DURATION_MINUTES);
    }

    public boolean isAllowed(String key, int limit, int durationMinutes) {
        return isAllowed(key, limit, durationMinutes, false);
    }

    /**
     * @param failClosed when true and Redis is unreachable the request is DENIED. Use this for endpoints that spend
     *                   money (paid AI calls): failing open there would remove the cost ceiling exactly when the
     *                   safety net is down.
     */
    public boolean isAllowed(String key, int limit, int durationMinutes, boolean failClosed) {
        long windowMillis = Duration.ofMinutes(durationMinutes).toMillis();
        try {
            Long count = redisTemplate.execute(
                    INCR_WITH_EXPIRY_SCRIPT,
                    Collections.singletonList(redisKey(key)),
                    String.valueOf(windowMillis)
            );
            return count != null && count <= limit;
        } catch (DataAccessException e) {
            if (failClosed) {
                log.warn("Redis unavailable, denying request on fail-closed limit: {}", key);
                return false;
            }
            log.warn("Redis unavailable, allowing request through without rate limiting: {}", key);
            return true;
        }
    }

    private static final DefaultRedisScript<Long> ADD_WITH_EXPIRY_SCRIPT = new DefaultRedisScript<>(
            "local total = redis.call('INCRBY', KEYS[1], ARGV[2]) " +
                    "if total == tonumber(ARGV[2]) then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end " +
                    "return total",
            Long.class
    );

    /**
     * Adds {@code amount} units (e.g. estimated model tokens) to a rolling budget and reports whether the total is
     * still within {@code budget}. Fails closed when Redis is unavailable. A budget of 0 or less disables the check.
     */
    public boolean tryConsume(String key, long amount, long budget, int windowMinutes) {
        if (budget <= 0) {
            return true;
        }
        try {
            Long total = redisTemplate.execute(
                    ADD_WITH_EXPIRY_SCRIPT,
                    Collections.singletonList(redisKey(key)),
                    String.valueOf(Duration.ofMinutes(windowMinutes).toMillis()),
                    String.valueOf(Math.max(1, amount))
            );
            return total != null && total <= budget;
        } catch (DataAccessException e) {
            log.warn("Redis unavailable, denying spend on budget: {}", key);
            return false;
        }
    }

    public long getAvailableTokens(String key) {
        try {
            String raw = redisTemplate.opsForValue().get(redisKey(key));
            if (raw == null) {
                return DEFAULT_LIMIT;
            }
            long used = Long.parseLong(raw);
            return Math.max(0, DEFAULT_LIMIT - used);
        } catch (DataAccessException e) {
            log.warn("Redis unavailable, reporting full quota for: {}", key);
            return DEFAULT_LIMIT;
        }
    }

    public void resetLimit(String key) {
        redisTemplate.delete(redisKey(key));
    }

    private String redisKey(String key) {
        return KEY_PREFIX + key;
    }
}
