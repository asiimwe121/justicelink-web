package lcdjp.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String KEY_PREFIX = "jwt:blacklist:";
    private static final long DEFAULT_LIFETIME_MILLIS = 86_400_000L;

    /**
     * After a Redis failure, skip Redis for this long and apply the fail-open / fail-closed policy straight away.
     * Without this, every authenticated request waits out the full Redis timeout (2s) during an outage, which
     * ties up all request threads and takes the whole API down even though the policy says "carry on".
     */
    private static final long REDIS_RETRY_AFTER_MILLIS = 15_000L;

    private final StringRedisTemplate redisTemplate;

    private final Map<String, Long> localFallback = new ConcurrentHashMap<>();

    /** 0 = Redis considered healthy; otherwise the time (millis) before which Redis is skipped. */
    private final AtomicLong redisDownUntil = new AtomicLong(0L);

    private LongSupplier clock = System::currentTimeMillis;

    /**
     * What to do when Redis cannot be reached while checking a token.
     * false (default): accept the token, so an outage doesn't log everyone out,
     *                  but tokens that were logged out work again until Redis is back.
     * true:            treat the token as revoked, so nobody gets in on a revoked
     *                  token, but every authenticated request fails during the outage.
     *
     * Why the default is false: the revocations that matter for security (password change or reset,
     * account deactivation, admin "end all sessions") live in MySQL (SessionRevocationService), not
     * in Redis. Redis only holds plain logouts, for tokens that live at most 24 hours. Failing closed
     * would turn a Redis blip into a platform-wide outage for people reporting emergencies, in exchange
     * for protecting against a replay of a logged-out token that needs the outage to coincide with a
     * stolen token. Same rule as RateLimiterService: fail closed only where failing open costs money.
     */
    @Value("${app.security.blacklist-fail-closed:false}")
    private boolean failClosed;

    @Autowired
    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklistToken(String token, Date expiry) {
        if (token == null) return;
        long now = System.currentTimeMillis();
        long expiryMillis = expiry != null ? expiry.getTime() : now + DEFAULT_LIFETIME_MILLIS;
        long ttlMillis = expiryMillis - now;
        if (ttlMillis <= 0) {
            return;
        }
        String key = redisKey(token);
        if (!mayUseRedis()) {
            localFallback.put(key, expiryMillis);
            return;
        }
        try {
            redisTemplate.opsForValue().set(key, "1", Duration.ofMillis(ttlMillis));
            redisSucceeded();
        } catch (DataAccessException e) {
            redisFailed("blacklisting a token; keeping it in this instance's memory only", e);
            localFallback.put(key, expiryMillis);
        }
    }

    void setFailClosed(boolean failClosed) {
        this.failClosed = failClosed;
    }

    /** Test hook: lets tests move time forward instead of sleeping. */
    void setClock(LongSupplier clock) {
        this.clock = clock;
    }

    public void blacklistToken(String token) {
        blacklistToken(token, (Date) null);
    }

    public boolean isTokenBlacklisted(String token) {
        if (token == null) return false;
        String key = redisKey(token);

        Long localExpiry = localFallback.get(key);
        if (localExpiry != null) {
            if (localExpiry >= System.currentTimeMillis()) {
                return true;
            }
            localFallback.remove(key);
        }

        if (!mayUseRedis()) {
            return failClosed;
        }
        try {
            boolean blacklisted = Boolean.TRUE.equals(redisTemplate.hasKey(key));
            redisSucceeded();
            return blacklisted;
        } catch (DataAccessException e) {
            redisFailed("checking the token blacklist; treating tokens as "
                    + (failClosed ? "blacklisted (fail-closed)" : "not blacklisted (fail-open)"), e);
            return failClosed;
        }
    }

    /**
     * True when Redis should be tried. While Redis is marked down this is false, except that once the
     * retry interval has passed exactly one caller is let through to probe it.
     */
    private boolean mayUseRedis() {
        long until = redisDownUntil.get();
        if (until == 0L) {
            return true;
        }
        long now = clock.getAsLong();
        if (now < until) {
            return false;
        }
        return redisDownUntil.compareAndSet(until, now + REDIS_RETRY_AFTER_MILLIS);
    }

    private void redisSucceeded() {
        if (redisDownUntil.get() != 0L && redisDownUntil.getAndSet(0L) != 0L) {
            log.info("Redis is reachable again; token blacklist checks resumed");
        }
    }

    private void redisFailed(String whileDoing, DataAccessException e) {
        long previous = redisDownUntil.getAndSet(clock.getAsLong() + REDIS_RETRY_AFTER_MILLIS);
        if (previous == 0L) {
            // Logged once per outage, not once per request.
            log.error("Redis unavailable while {}; skipping Redis for {}s: {}",
                    whileDoing, REDIS_RETRY_AFTER_MILLIS / 1000, e.getMessage());
        }
    }

    @Scheduled(fixedRate = 3_600_000L)
    public void evictExpired() {
        long now = System.currentTimeMillis();
        localFallback.entrySet().removeIf(entry -> entry.getValue() < now);
    }

    private static String redisKey(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return KEY_PREFIX + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
