package lcdjp.common;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig implements org.springframework.cache.annotation.CachingConfigurer {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CacheConfig.class);

    private static final String[] CACHE_NAMES = {
            "emergencies", "cases", "statistics"
    };

    /**
     * The serializer Redis uses for cached values. Exposed so tests can push cached values through
     * the exact same JSON round trip (the test profile has no Redis, so cache bugs hide there).
     */
    public static GenericJackson2JsonRedisSerializer valueSerializer() {
        return new GenericJackson2JsonRedisSerializer();
    }

    @Bean
    @Profile("!test")
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory,
                                           org.springframework.core.env.Environment env) {
        long ttlMillis = env.getProperty("spring.cache.redis.time-to-live", Long.class, 600_000L);

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMillis(ttlMillis))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(valueSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .initialCacheNames(java.util.Set.of(CACHE_NAMES))
                .build();
    }

    @Bean
    @Profile("test")
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(CACHE_NAMES);
        manager.setCaffeine(com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(10))
                .maximumSize(10_000));
        return manager;
    }

    /**
     * A cache is an optimisation, never a dependency: if Redis is down or a cached value cannot be read,
     * log it and let the method run against MySQL instead of failing the request with a 500.
     */
    @Override
    public org.springframework.cache.interceptor.CacheErrorHandler errorHandler() {
        return new org.springframework.cache.interceptor.CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException e, org.springframework.cache.Cache cache, Object key) {
                log.warn("[cache] read failed for {}::{}, using the database instead: {}", cache.getName(), key, e.toString());
            }

            @Override
            public void handleCachePutError(RuntimeException e, org.springframework.cache.Cache cache, Object key, Object value) {
                log.warn("[cache] write failed for {}::{}: {}", cache.getName(), key, e.toString());
            }

            @Override
            public void handleCacheEvictError(RuntimeException e, org.springframework.cache.Cache cache, Object key) {
                // A failed evict can leave stale statistics until the TTL (10 min); still better than failing the write.
                log.warn("[cache] evict failed for {}::{} (entry expires by TTL): {}", cache.getName(), key, e.toString());
            }

            @Override
            public void handleCacheClearError(RuntimeException e, org.springframework.cache.Cache cache) {
                log.warn("[cache] clear failed for {} (entries expire by TTL): {}", cache.getName(), e.toString());
            }
        };
    }
}
