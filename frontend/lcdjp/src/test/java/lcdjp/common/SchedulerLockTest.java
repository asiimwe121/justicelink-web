package lcdjp.common;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class SchedulerLockTest {

    /** In-memory stand-in for Redis that shares one key space between "instances". */
    static class FakeStore implements SchedulerLock.LockStore {
        final Map<String, String> values = new HashMap<>();
        final Map<String, Duration> ttls = new HashMap<>();
        boolean down;

        private void check() {
            if (down) throw new IllegalStateException("redis down");
        }

        @Override
        public boolean acquire(String key, String token, Duration ttl) {
            check();
            if (values.containsKey(key)) return false;
            values.put(key, token);
            ttls.put(key, ttl);
            return true;
        }

        @Override
        public boolean extend(String key, String token, Duration ttl) {
            check();
            if (!token.equals(values.get(key))) return false;
            ttls.put(key, ttl);
            return true;
        }

        @Override
        public boolean release(String key, String token) {
            check();
            if (!token.equals(values.get(key))) return false;
            values.remove(key);
            ttls.remove(key);
            return true;
        }
    }

    private static final Duration MAX_RUN = Duration.ofMinutes(10);
    private static final Duration HOLD = Duration.ofMinutes(5);

    @Test
    void firstInstanceRunsTheJob() {
        SchedulerLock lock = new SchedulerLock(new FakeStore());
        AtomicInteger runs = new AtomicInteger();

        boolean ran = lock.runExclusive("job", MAX_RUN, HOLD, runs::incrementAndGet);

        assertTrue(ran);
        assertEquals(1, runs.get());
    }

    @Test
    void secondInstanceFiringRightAfterDoesNotRerunAFastJob() {
        FakeStore shared = new FakeStore();
        SchedulerLock instanceA = new SchedulerLock(shared);
        SchedulerLock instanceB = new SchedulerLock(shared);
        AtomicInteger runs = new AtomicInteger();

        assertTrue(instanceA.runExclusive("job", MAX_RUN, HOLD, runs::incrementAndGet));
        // The job already finished, but the lock is held for a few more minutes.
        assertFalse(instanceB.runExclusive("job", MAX_RUN, HOLD, runs::incrementAndGet));

        assertEquals(1, runs.get());
    }

    @Test
    void secondInstanceSkipsWhileTheFirstIsStillRunning() {
        FakeStore shared = new FakeStore();
        SchedulerLock instanceA = new SchedulerLock(shared);
        SchedulerLock instanceB = new SchedulerLock(shared);
        AtomicInteger bRuns = new AtomicInteger();

        instanceA.runExclusive("job", MAX_RUN, HOLD, () ->
                assertFalse(instanceB.runExclusive("job", MAX_RUN, HOLD, bRuns::incrementAndGet)));

        assertEquals(0, bRuns.get());
    }

    @Test
    void afterARunTheLockIsShortenedToTheHoldTime() {
        FakeStore store = new FakeStore();
        new SchedulerLock(store).runExclusive("job", MAX_RUN, HOLD, () -> { });

        assertEquals(HOLD, store.ttls.get("scheduler-lock:job"));
    }

    @Test
    void differentJobsDoNotBlockEachOther() {
        FakeStore store = new FakeStore();
        SchedulerLock lock = new SchedulerLock(store);
        AtomicInteger runs = new AtomicInteger();

        assertTrue(lock.runExclusive("one", MAX_RUN, HOLD, runs::incrementAndGet));
        assertTrue(lock.runExclusive("two", MAX_RUN, HOLD, runs::incrementAndGet));

        assertEquals(2, runs.get());
    }

    @Test
    void failedJobReleasesTheLockSoTheNextTickCanRetry() {
        FakeStore store = new FakeStore();
        SchedulerLock lock = new SchedulerLock(store);

        assertThrows(IllegalArgumentException.class, () ->
                lock.runExclusive("job", MAX_RUN, HOLD, () -> { throw new IllegalArgumentException("boom"); }));

        assertTrue(store.values.isEmpty());
        AtomicInteger runs = new AtomicInteger();
        assertTrue(lock.runExclusive("job", MAX_RUN, HOLD, runs::incrementAndGet));
        assertEquals(1, runs.get());
    }

    @Test
    void zeroHoldReleasesImmediately() {
        FakeStore store = new FakeStore();
        new SchedulerLock(store).runExclusive("job", MAX_RUN, Duration.ZERO, () -> { });

        assertTrue(store.values.isEmpty());
    }

    @Test
    void redisDownSkipsTheRunInsteadOfThrowingOrRunningEverywhere() {
        FakeStore store = new FakeStore();
        store.down = true;
        AtomicInteger runs = new AtomicInteger();

        boolean ran = new SchedulerLock(store).runExclusive("job", MAX_RUN, HOLD, runs::incrementAndGet);

        assertFalse(ran);
        assertEquals(0, runs.get());
    }

    @Test
    void redisFailingAfterTheRunDoesNotFailTheJob() {
        FakeStore store = new FakeStore() {
            @Override
            public boolean extend(String key, String token, Duration ttl) {
                throw new IllegalStateException("redis went away");
            }
        };
        AtomicInteger runs = new AtomicInteger();

        assertTrue(new SchedulerLock(store).runExclusive("job", MAX_RUN, HOLD, runs::incrementAndGet));
        assertEquals(1, runs.get());
    }
}
