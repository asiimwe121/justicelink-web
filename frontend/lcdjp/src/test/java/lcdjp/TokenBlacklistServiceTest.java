package lcdjp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class TokenBlacklistServiceTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> ops;
    private TokenBlacklistService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        ops = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(ops);
        service = new TokenBlacklistService(redisTemplate);
    }

    @Test
    void tokenNotBlacklistedByDefault() {
        when(redisTemplate.hasKey(anyString())).thenReturn(false);

        assertFalse(service.isTokenBlacklisted("never-seen-token"));
    }

    @Test
    void blacklistingStoresAHashedKeyWithTheTokensRemainingLifetime() {
        service.blacklistToken("secret.jwt.value", new Date(System.currentTimeMillis() + 60_000));

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> ttl = ArgumentCaptor.forClass(Duration.class);
        verify(ops).set(key.capture(), eq("1"), ttl.capture());

        assertTrue(key.getValue().startsWith("jwt:blacklist:"));
        assertFalse(key.getValue().contains("secret.jwt.value"), "raw token must not be stored in Redis");
        assertTrue(ttl.getValue().toMillis() > 0 && ttl.getValue().toMillis() <= 60_000);
    }

    @Test
    void blacklistedTokenIsReportedWhenRedisHasTheKey() {
        when(redisTemplate.hasKey(anyString())).thenReturn(true);

        assertTrue(service.isTokenBlacklisted("token-a"));
    }

    @Test
    void alreadyExpiredTokenIsNotStored() {
        service.blacklistToken("token-b", new Date(System.currentTimeMillis() - 1_000));

        verify(ops, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void nullExpiryFallsBackToAConservativeDefaultLifetime() {
        service.blacklistToken("unparseable-token", null);

        ArgumentCaptor<Duration> ttl = ArgumentCaptor.forClass(Duration.class);
        verify(ops).set(anyString(), eq("1"), ttl.capture());
        assertTrue(ttl.getValue().toHours() >= 23 && ttl.getValue().toHours() <= 24);
    }

    @Test
    void oneArgOverloadAlsoBlacklistsUsingTheDefaultExpiry() {
        service.blacklistToken("token-c");

        verify(ops).set(anyString(), eq("1"), any(Duration.class));
    }

    @Test
    void redisWriteFailureFallsBackToThisInstancesMemory() {
        doThrow(new RedisConnectionFailureException("down"))
                .when(ops).set(anyString(), anyString(), any(Duration.class));
        when(redisTemplate.hasKey(anyString())).thenThrow(new RedisConnectionFailureException("down"));

        service.blacklistToken("token-d", new Date(System.currentTimeMillis() + 60_000));

        assertTrue(service.isTokenBlacklisted("token-d"));
        assertFalse(service.isTokenBlacklisted("some-other-token"));
    }

    @Test
    void redisReadFailureFailsOpen() {
        when(redisTemplate.hasKey(anyString())).thenThrow(new RedisConnectionFailureException("down"));

        assertFalse(service.isTokenBlacklisted("token-e"));
    }

    @Test
    void nullTokenIsNeverBlacklisted() {
        assertFalse(service.isTokenBlacklisted(null));
        service.blacklistToken(null, new Date(System.currentTimeMillis() + 60_000));

        verifyNoInteractions(ops);
    }
}
