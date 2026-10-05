package lcdjp;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class CacheService {
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final long DEFAULT_TTL = 300000;

    private static class CacheEntry {
        Object value;
        LocalDateTime expiry;

        CacheEntry(Object value, long ttlMillis) {
            this.value = value;
            this.expiry = LocalDateTime.now().plusNanos(ttlMillis * 1000000);
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    public void put(String key, Object value) {
        put(key, value, DEFAULT_TTL);
    }

    public void put(String key, Object value, long ttlMillis) {
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