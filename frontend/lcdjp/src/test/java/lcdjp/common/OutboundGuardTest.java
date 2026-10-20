package lcdjp.common;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class OutboundGuardTest {

    @Test
    void retriesThenSucceeds() throws Exception {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 3, 1);
        AtomicInteger calls = new AtomicInteger();
        String r = g.call(() -> {
            if (calls.incrementAndGet() < 3) throw new RuntimeException("flaky");
            return "ok";
        });
        assertEquals("ok", r);
        assertEquals(3, calls.get());
        assertFalse(g.isOpen());
    }

    @Test
    void noRetryCallsOnlyOnce() {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 1, 0);
        AtomicInteger calls = new AtomicInteger();
        assertThrows(RuntimeException.class, () -> g.call(() -> {
            calls.incrementAndGet();
            throw new RuntimeException("down");
        }));
        assertEquals(1, calls.get());
    }

    @Test
    void opensAfterThresholdAndSkipsCalls() {
        OutboundGuard g = new OutboundGuard("t", 2, 60_000, 1, 0);
        AtomicInteger calls = new AtomicInteger();
        for (int i = 0; i < 2; i++) {
            assertThrows(RuntimeException.class, () -> g.call(() -> {
                calls.incrementAndGet();
                throw new RuntimeException("down");
            }));
        }
        assertTrue(g.isOpen());
        assertThrows(OutboundGuard.CircuitOpenException.class, () -> g.call(() -> {
            calls.incrementAndGet();
            return "x";
        }));
        assertEquals(2, calls.get());
    }

    @Test
    void closesAgainAfterSuccessfulProbe() throws Exception {
        OutboundGuard g = new OutboundGuard("t", 1, 50, 1, 0);
        assertThrows(RuntimeException.class, () -> g.call(() -> { throw new RuntimeException("down"); }));
        assertTrue(g.isOpen());
        Thread.sleep(80);
        assertEquals("ok", g.call(() -> "ok"));
        assertFalse(g.isOpen());
        assertEquals("ok", g.call(() -> "ok"));
    }

    @Test
    void failedProbeReopensCircuit() throws Exception {
        OutboundGuard g = new OutboundGuard("t", 3, 50, 1, 0);
        for (int i = 0; i < 3; i++) {
            assertThrows(RuntimeException.class, () -> g.call(() -> { throw new RuntimeException("down"); }));
        }
        Thread.sleep(80);
        assertThrows(RuntimeException.class, () -> g.call(() -> { throw new RuntimeException("still down"); }));
        assertTrue(g.isOpen());
    }

    @Test
    void rejectionIsNeverRetried() {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 3, 1);
        AtomicInteger calls = new AtomicInteger();

        assertThrows(ProviderRejectedException.class, () -> g.call(() -> {
            calls.incrementAndGet();
            throw new ProviderRejectedException("bad address", 400, "{}");
        }));

        assertEquals(1, calls.get());
    }

    @Test
    void manyRejectionsNeverOpenTheCircuit() throws Exception {
        OutboundGuard g = new OutboundGuard("t", 2, 60_000, 1, 0);

        for (int i = 0; i < 10; i++) {
            assertThrows(ProviderRejectedException.class, () -> g.call(() -> {
                throw new ProviderRejectedException("refused", 400, "");
            }));
        }

        assertFalse(g.isOpen());
        assertEquals("still works", g.call(() -> "still works"));
    }

    @Test
    void rejectionsDoNotCountTowardTheFailureStreak() throws Exception {
        OutboundGuard g = new OutboundGuard("t", 2, 60_000, 1, 0);
        assertThrows(RuntimeException.class, () -> g.call(() -> { throw new RuntimeException("down"); }));
        // The provider answered (it refused the request), so the earlier failure no longer counts as a streak.
        assertThrows(ProviderRejectedException.class, () -> g.call(() -> {
            throw new ProviderRejectedException("refused", 400, "");
        }));
        assertThrows(RuntimeException.class, () -> g.call(() -> { throw new RuntimeException("down"); }));

        assertFalse(g.isOpen());
    }

    @Test
    void rejectedProbeClosesTheCircuitBecauseTheProviderIsUp() throws Exception {
        OutboundGuard g = new OutboundGuard("t", 1, 50, 1, 0);
        assertThrows(RuntimeException.class, () -> g.call(() -> { throw new RuntimeException("down"); }));
        assertTrue(g.isOpen());
        Thread.sleep(80);

        assertThrows(ProviderRejectedException.class, () -> g.call(() -> {
            throw new ProviderRejectedException("refused", 400, "");
        }));

        assertFalse(g.isOpen());
    }

    @Test
    void timeLimitStopsNewAttempts() {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 5, 200);
        AtomicInteger calls = new AtomicInteger();

        assertThrows(RuntimeException.class, () -> g.call(() -> {
            calls.incrementAndGet();
            throw new RuntimeException("down");
        }, 100));

        assertEquals(1, calls.get(), "the next backoff would pass the 100 ms limit, so no retry");
    }

    @Test
    void noTimeLimitMeansAllAttemptsAreUsed() {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 3, 1);
        AtomicInteger calls = new AtomicInteger();

        assertThrows(RuntimeException.class, () -> g.call(() -> {
            calls.incrementAndGet();
            throw new RuntimeException("down");
        }));

        assertEquals(3, calls.get());
    }

    @Test
    void backoffIsJitteredWithinHalfToFullOfTheNominalDelay() {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 3, 400);
        boolean sawDifferent = false;
        long first = g.backoffDelay(2, new RuntimeException("x"));
        for (int i = 0; i < 200; i++) {
            long d = g.backoffDelay(2, new RuntimeException("x")); // nominal 800 ms
            assertTrue(d >= 400 && d <= 800, "delay " + d);
            if (d != first) sawDifferent = true;
        }
        assertTrue(sawDifferent, "delays should not all be identical");
    }

    @Test
    void retryAfterIsHonouredButCapped() {
        OutboundGuard g = new OutboundGuard("t", 5, 1000, 3, 10);

        long asked = g.backoffDelay(1, new TransientProviderException("busy", 429, "", 2_000));
        long capped = g.backoffDelay(1, new TransientProviderException("busy", 429, "", 60_000));

        assertTrue(asked >= 2_000);
        assertEquals(OutboundGuard.MAX_RETRY_AFTER_MILLIS, capped);
    }
}
