package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
    private static final String KEY_PREFIX = "jwt:blacklist:";
    private static final long DEFAULT_LIFETIME_MILLIS = 86_400_000L;

    private final StringRedisTemplate redisTemplate;

    private final Map<String, Long> localFallback = new ConcurrentHashMap<>();

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
        try {
            redisTemplate.opsForValue().set(key, "1", Duration.ofMillis(ttlMillis));
        } catch (DataAccessException e) {
            log.error("Redis unavailable while blacklisting a token; keeping it in this instance's memory only: {}",
                    e.getMessage());
            localFallback.put(key, expiryMillis);
        }
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

        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (DataAccessException e) {
            log.error("Redis unavailable while checking the token blacklist; treating the token as not blacklisted: {}",
                    e.getMessage());
            return false;
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
