package lcdjp;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimiter {
    private final Map<String, AtomicInteger> requestCounts = new ConcurrentHashMap<>();
    private final Map<String, Long> lastResetTime = new ConcurrentHashMap<>();
    private final int MAX_REQUESTS = 10;
    private final long RESET_INTERVAL = 60000;

    public boolean isAllowed(String clientId) {
        long now = System.currentTimeMillis();
        long lastReset = lastResetTime.getOrDefault(clientId, 0L);

        if (now - lastReset > RESET_INTERVAL) {
            requestCounts.put(clientId, new AtomicInteger(0));
            lastResetTime.put(clientId, now);
        }

        int count = requestCounts.computeIfAbsent(clientId, k -> new AtomicInteger(0)).incrementAndGet();
        return count <= MAX_REQUESTS;
    }
}