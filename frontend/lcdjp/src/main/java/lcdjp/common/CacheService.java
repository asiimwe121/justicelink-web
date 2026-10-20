package lcdjp.common;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Small in-process key/value cache used by the monitoring endpoints. It lives in one JVM only (each replica has its
 * own copy), so anything that must be shared between instances belongs in Redis through Spring's cache annotations
 * instead. The size is bounded: when the limit is reached expired entries are dropped first, and if it is still full
 * the cache is emptied rather than growing without limit.
 */
@Component
public class CacheService {
    static final int MAX_ENTRIES = 10_000;
    private static final long DEFAULT_TTL = 300_000;

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    private static final class CacheEntry {
        final Object value;
        final long expiresAtMillis;

        CacheEntry(Object value, long ttlMillis) {
            this.value = value;
            this.expiresAtMillis = System.currentTimeMillis() + ttlMillis;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAtMillis;
        }
    }

    public void put(String key, Object value) {
        put(key, value, DEFAULT_TTL);
    }

    public void put(String key, Object value, long ttlMillis) {
        if (cache.size() >= MAX_ENTRIES && !cache.containsKey(key)) {
            cache.values().removeIf(CacheEntry::isExpired);
            if (cache.size() >= MAX_ENTRIES) {
                cache.clear();
            }
        }
        cache.put(key, new CacheEntry(value, ttlMillis));
    }

    public Optional<Object> get(String key) {
        CacheEntry entry = cache.get(key);
        if (entry == null || entry.isExpired()) {
            cache.remove(key);
            return Optional.empty();
        }
        return Optional.of(entry.value);
    }

    public void clear(String key) {
        cache.remove(key);
    }

    public void clearAll() {
        cache.clear();
    }

    public int getSize() {
        return cache.size();
    }
}
