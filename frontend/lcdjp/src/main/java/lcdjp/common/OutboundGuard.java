package lcdjp.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.Callable;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Small retry-with-backoff plus circuit breaker for calls to external providers.
 *
 * After {@code failureThreshold} consecutive failed calls the circuit opens and
 * calls fail immediately with {@link CircuitOpenException} for {@code openMillis},
 * so a flaky provider is not hit (and waited on) for every request. After that
 * window one trial call is let through; success closes the circuit, failure
 * re-opens it.
 *
 * Retries are for idempotent calls only (lookups, embeddings, email through Brevo's idempotent send).
 * Pass maxAttempts = 1 for calls that must not be repeated (SMS, AI chat, single-use tokens).
 *
 * A {@link ProviderRejectedException} means the provider is up but refused this request. It is never
 * retried and never counts toward the circuit; it counts as proof the provider answered. Backoff is
 * jittered so many instances do not retry in lockstep, a provider's Retry-After (see
 * {@link TransientProviderException}) is honoured up to {@link #MAX_RETRY_AFTER_MILLIS}, and a call can
 * carry an overall time limit after which no new attempt starts.
 */
public class OutboundGuard {

    private static final Logger log = LoggerFactory.getLogger(OutboundGuard.class);

    public static class CircuitOpenException extends RuntimeException {
        public CircuitOpenException(String name) {
            super("Circuit open for " + name + "; skipping call");
        }
    }

    /** Longest Retry-After delay we will actually wait for. */
    static final long MAX_RETRY_AFTER_MILLIS = 5_000L;

    private final String name;
    private final int failureThreshold;
    private final long openMillis;
    private final int maxAttempts;
    private final long backoffMillis;

    private final AtomicInteger consecutiveFailures = new AtomicInteger();
    private final AtomicLong openUntil = new AtomicLong(0);
    private final AtomicLong trialInFlightSince = new AtomicLong(0);

    public OutboundGuard(String name, int failureThreshold, long openMillis, int maxAttempts, long backoffMillis) {
        this.name = name;
        this.failureThreshold = Math.max(1, failureThreshold);
        this.openMillis = openMillis;
        this.maxAttempts = Math.max(1, maxAttempts);
        this.backoffMillis = backoffMillis;
    }

    /** Typical settings: 5 failures opens the circuit for 30s; 3 attempts with 300ms/600ms backoff. */
    public static OutboundGuard withRetries(String name) {
        return new OutboundGuard(name, 5, 30_000L, 3, 300L);
    }

    /** Like {@link #withRetries(String)} but with a longer first backoff (for providers such as email). */
    public static OutboundGuard withRetries(String name, long backoffMillis) {
        return new OutboundGuard(name, 5, 30_000L, 3, backoffMillis);
    }

    /** For non-idempotent calls: circuit breaker only, never repeats the call. */
    public static OutboundGuard noRetry(String name) {
        return new OutboundGuard(name, 5, 30_000L, 1, 0L);
    }

    public boolean isOpen() {
        return System.currentTimeMillis() < openUntil.get();
    }

    public <T> T call(Callable<T> action) throws Exception {
        return call(action, 0L);
    }

    /**
     * @param timeLimitMillis no new attempt starts once this much time has passed since the call began
     *                        (checked between attempts, not during one); 0 means no limit
     */
    public <T> T call(Callable<T> action, long timeLimitMillis) throws Exception {
        long now = System.currentTimeMillis();
        long until = openUntil.get();
        if (now < until) {
            throw new CircuitOpenException(name);
        }
        // Half-open: only one caller probes the provider after the open window.
        if (until != 0) {
            long since = trialInFlightSince.get();
            boolean probeStale = since != 0 && now - since > 60_000L;
            if (since != 0 && !probeStale) {
                throw new CircuitOpenException(name);
            }
            if (!trialInFlightSince.compareAndSet(since, now)) {
                throw new CircuitOpenException(name);
            }
        }

        final long startNanos = System.nanoTime();
        Exception last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                T result = action.call();
                onSuccess();
                return result;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                trialInFlightSince.set(0);
                throw ie;
            } catch (ProviderRejectedException rejected) {
                // The provider answered and said no to this request: not an outage, not retried.
                onSuccess();
                throw rejected;
            } catch (Exception e) {
                last = e;
                log.warn("[{}] call failed (attempt {}/{}): {}", name, attempt, maxAttempts, e.getMessage());
                if (attempt < maxAttempts) {
                    long delay = backoffDelay(attempt, e);
                    if (timeLimitMillis > 0 && elapsedMillis(startNanos) + delay >= timeLimitMillis) {
                        log.warn("[{}] time limit of {} ms reached; not retrying", name, timeLimitMillis);
                        break;
                    }
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        trialInFlightSince.set(0);
                        throw ie;
                    }
                }
            }
        }
        onFailure();
        throw last;
    }

    /** Exponential backoff with jitter (between half and all of the nominal delay), at least Retry-After if given. */
    long backoffDelay(int attempt, Exception failure) {
        long nominal = backoffMillis * (1L << (attempt - 1));
        long jittered = nominal <= 1 ? nominal : nominal / 2 + ThreadLocalRandom.current().nextLong(nominal / 2 + 1);
        if (failure instanceof TransientProviderException transientFailure && transientFailure.getRetryAfterMillis() > 0) {
            long asked = Math.min(transientFailure.getRetryAfterMillis(), MAX_RETRY_AFTER_MILLIS);
            return Math.max(jittered, asked);
        }
        return jittered;
    }

    private static long elapsedMillis(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000L;
    }

    private void onSuccess() {
        consecutiveFailures.set(0);
        openUntil.set(0);
        trialInFlightSince.set(0);
    }

    private void onFailure() {
        int failures = consecutiveFailures.incrementAndGet();
        boolean wasProbe = trialInFlightSince.getAndSet(0) != 0;
        if (wasProbe || failures >= failureThreshold) {
            openUntil.set(System.currentTimeMillis() + openMillis);
            log.error("[{}] circuit opened for {} ms after {} consecutive failures", name, openMillis, failures);
        }
    }
}
