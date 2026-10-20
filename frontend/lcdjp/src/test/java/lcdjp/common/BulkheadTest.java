package lcdjp.common;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class BulkheadTest {

    @Test
    void grantsUpToTheCapThenTurnsCallersAway() {
        Bulkhead bulkhead = new Bulkhead("test", 2);

        assertTrue(bulkhead.tryAcquire());
        assertTrue(bulkhead.tryAcquire());
        assertFalse(bulkhead.tryAcquire());
        assertEquals(2, bulkhead.inFlight());
        assertEquals(0, bulkhead.available());
    }

    @Test
    void releasedPermitCanBeTakenAgain() {
        Bulkhead bulkhead = new Bulkhead("test", 1);
        assertTrue(bulkhead.tryAcquire());
        assertFalse(bulkhead.tryAcquire());

        bulkhead.release();

        assertTrue(bulkhead.tryAcquire());
    }

    @Test
    void doubleReleaseNeverRaisesTheCapAboveTheLimit() {
        Bulkhead bulkhead = new Bulkhead("test", 1);
        assertTrue(bulkhead.tryAcquire());
        bulkhead.release();
        bulkhead.release();

        assertTrue(bulkhead.tryAcquire());
        assertFalse(bulkhead.tryAcquire());
    }

    @Test
    void rejectsACapBelowOne() {
        assertThrows(IllegalArgumentException.class, () -> new Bulkhead("test", 0));
    }

    @Test
    void neverLetsMoreThanTheCapRunAtOnceUnderContention() throws Exception {
        int cap = 3;
        Bulkhead bulkhead = new Bulkhead("test", cap);
        AtomicInteger running = new AtomicInteger();
        AtomicInteger maxSeen = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        int callers = 20;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        try {
            for (int i = 0; i < callers; i++) {
                pool.submit(() -> {
                    start.await();
                    if (!bulkhead.tryAcquire()) {
                        rejected.incrementAndGet();
                        return null;
                    }
                    try {
                        int now = running.incrementAndGet();
                        maxSeen.accumulateAndGet(now, Math::max);
                        Thread.sleep(50);
                        running.decrementAndGet();
                    } finally {
                        bulkhead.release();
                    }
                    return null;
                });
            }
            start.countDown();
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }

        assertTrue(maxSeen.get() <= cap, "saw " + maxSeen.get() + " concurrent calls, cap is " + cap);
        assertEquals(cap, bulkhead.available());
    }
}
