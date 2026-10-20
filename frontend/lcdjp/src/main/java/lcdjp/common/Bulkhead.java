package lcdjp.common;

import java.util.concurrent.Semaphore;

/**
 * Caps how many request threads may be inside a slow external call at the same time.
 * Without a cap, one slow provider can tie up every Tomcat thread and the whole site stops
 * answering. Callers that cannot get a permit are turned away immediately (they never wait),
 * so the caller can fall back to a default reply instead of piling up behind the provider.
 *
 * <pre>
 * if (!bulkhead.tryAcquire()) { return fallback; }
 * try { return callProvider(); } finally { bulkhead.release(); }
 * </pre>
 */
public final class Bulkhead {

    private final String name;
    private final int maxConcurrent;
    private final Semaphore permits;

    public Bulkhead(String name, int maxConcurrent) {
        if (maxConcurrent < 1) {
            throw new IllegalArgumentException("maxConcurrent must be at least 1, got " + maxConcurrent);
        }
        this.name = name;
        this.maxConcurrent = maxConcurrent;
        this.permits = new Semaphore(maxConcurrent);
    }

    /** Takes a permit if one is free. Never blocks. Every {@code true} must be matched by {@link #release()}. */
    public boolean tryAcquire() {
        return permits.tryAcquire();
    }

    public void release() {
        // Guard against a double release pushing the count above the cap.
        if (permits.availablePermits() < maxConcurrent) {
            permits.release();
        }
    }

    public int available() {
        return permits.availablePermits();
    }

    public int inFlight() {
        return maxConcurrent - permits.availablePermits();
    }

    public int maxConcurrent() {
        return maxConcurrent;
    }

    public String name() {
        return name;
    }
}
