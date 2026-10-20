package lcdjp.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Makes a {@code @Scheduled} job run on one instance at a time when the app runs as several
 * replicas. The first instance to fire takes a Redis key ({@code SET key token NX PX ttl}); the
 * others skip that tick.
 *
 * <p>After a run the key is not deleted but shortened to {@code holdAfter}. A second instance whose
 * cron fires a moment later (clocks differ by milliseconds) still sees the key and does not rerun
 * the job. If the job throws, the key is released at once so the next tick can retry.
 *
 * <p>If Redis cannot be reached the run is skipped and logged. The jobs are periodic and catch up
 * on the next tick, which is safer than running on every replica and duplicating notifications.
 */
@Component
public class SchedulerLock {

    private static final Logger log = LoggerFactory.getLogger(SchedulerLock.class);
    private static final String KEY_PREFIX = "scheduler-lock:";

    /** Storage behind the lock; Redis in production, an in-memory fake in tests. */
    interface LockStore {
        /** SET key token NX with a TTL. True only if this call created the key. */
        boolean acquire(String key, String token, Duration ttl);

        /** Resets the TTL, but only if the key still holds {@code token}. */
        boolean extend(String key, String token, Duration ttl);

        /** Deletes the key, but only if it still holds {@code token}. */
        boolean release(String key, String token);
    }

    private final LockStore store;

    @Autowired
    public SchedulerLock(StringRedisTemplate redisTemplate) {
        this(new RedisLockStore(redisTemplate));
    }

    SchedulerLock(LockStore store) {
        this.store = store;
    }

    /**
     * Runs {@code job} if this instance wins the lock.
     *
     * @param name      job name, becomes part of the Redis key
     * @param maxRun    how long the lock may be held while the job runs (safety net if the instance dies)
     * @param holdAfter how long to keep the lock after a successful run, to absorb cron skew
     * @return true if the job ran on this instance
     */
    public boolean runExclusive(String name, Duration maxRun, Duration holdAfter, Runnable job) {
        String key = KEY_PREFIX + name;
        String token = UUID.randomUUID().toString();

        boolean acquired;
        try {
            acquired = store.acquire(key, token, maxRun);
        } catch (RuntimeException e) {
            log.warn("[scheduler-lock] Redis unavailable; skipping '{}' this run (it catches up on the next tick): {}",
                    name, e.getMessage());
            return false;
        }
        if (!acquired) {
            log.debug("[scheduler-lock] '{}' is held by another instance; skipping", name);
            return false;
        }

        try {
            job.run();
        } catch (RuntimeException | Error e) {
            safeRelease(key, token, name);
            throw e;
        }

        if (holdAfter != null && !holdAfter.isZero() && !holdAfter.isNegative()) {
            try {
                store.extend(key, token, holdAfter);
            } catch (RuntimeException e) {
                // The lock simply expires after maxRun; nothing else to do.
                log.warn("[scheduler-lock] could not shorten the lock for '{}': {}", name, e.getMessage());
            }
        } else {
            safeRelease(key, token, name);
        }
        return true;
    }

    private void safeRelease(String key, String token, String name) {
        try {
            store.release(key, token);
        } catch (RuntimeException e) {
            log.warn("[scheduler-lock] could not release the lock for '{}' (it will expire on its own): {}",
                    name, e.getMessage());
        }
    }

    /** Redis implementation. Both follow-up operations are Lua scripts so they are atomic and token-checked. */
    static final class RedisLockStore implements LockStore {

        private static final DefaultRedisScript<Long> RELEASE_SCRIPT = new DefaultRedisScript<>(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                Long.class);

        private static final DefaultRedisScript<Long> EXTEND_SCRIPT = new DefaultRedisScript<>(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end",
                Long.class);

        private final StringRedisTemplate redis;

        RedisLockStore(StringRedisTemplate redis) {
            this.redis = redis;
        }

        @Override
        public boolean acquire(String key, String token, Duration ttl) {
            return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(key, token, ttl));
        }

        @Override
        public boolean extend(String key, String token, Duration ttl) {
            Long result = redis.execute(EXTEND_SCRIPT, List.of(key), token, String.valueOf(ttl.toMillis()));
            return result != null && result > 0;
        }

        @Override
        public boolean release(String key, String token) {
            Long result = redis.execute(RELEASE_SCRIPT, List.of(key), token);
            return result != null && result > 0;
        }
    }
}
