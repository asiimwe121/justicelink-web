package lcdjp.notification;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class NotificationDispatcherTest {

    private static ThreadPoolExecutor pool(int threads, int queue) {
        return new ThreadPoolExecutor(threads, threads, 1, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(queue), new ThreadPoolExecutor.AbortPolicy());
    }

    @Test
    void sendsTheEmailOnAnotherThread() throws Exception {
        EmailService email = mock(EmailService.class);
        CountDownLatch sent = new CountDownLatch(1);
        Thread caller = Thread.currentThread();
        java.util.concurrent.atomic.AtomicReference<Thread> senderThread = new java.util.concurrent.atomic.AtomicReference<>();
        doAnswer(inv -> {
            senderThread.set(Thread.currentThread());
            sent.countDown();
            return null;
        }).when(email).sendEmail(anyString(), anyString(), anyString());
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, pool(1, 5), 5);

        assertTrue(dispatcher.sendEmail("jane@example.com", "Hello", "<p>hi</p>"));

        assertTrue(sent.await(5, TimeUnit.SECONDS));
        assertNotSame(caller, senderThread.get());
        verify(email).sendEmail("jane@example.com", "Hello", "<p>hi</p>");
        dispatcher.shutdown();
    }

    @Test
    void aFailingMailProviderNeverReachesTheCaller() throws Exception {
        EmailService email = mock(EmailService.class);
        CountDownLatch attempted = new CountDownLatch(1);
        doAnswer(inv -> {
            attempted.countDown();
            throw new IOException("brevo down");
        }).when(email).sendEmail(anyString(), anyString(), anyString());
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, pool(1, 5), 5);

        assertTrue(dispatcher.sendEmail("jane@example.com", "Hello", "body"));

        assertTrue(attempted.await(5, TimeUnit.SECONDS));
        dispatcher.shutdown();
    }

    @Test
    void blankOrMissingRecipientIsSkipped() {
        EmailService email = mock(EmailService.class);
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, pool(1, 5), 5);

        assertFalse(dispatcher.sendEmail(null, "s", "b"));
        assertFalse(dispatcher.sendEmail("  ", "s", "b"));

        verifyNoInteractions(email);
        dispatcher.shutdown();
    }

    @Test
    void fullQueueDropsTheNotificationInsteadOfBlocking() throws Exception {
        EmailService email = mock(EmailService.class);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);
        doAnswer(inv -> {
            started.countDown();
            release.await(10, TimeUnit.SECONDS);
            return null;
        }).when(email).sendEmail(anyString(), anyString(), anyString());
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, pool(1, 1), 5);

        assertTrue(dispatcher.sendEmail("a@example.com", "1", "b"));   // taken by the worker
        assertTrue(started.await(5, TimeUnit.SECONDS));
        assertTrue(dispatcher.sendEmail("b@example.com", "2", "b"));   // waits in the queue
        assertFalse(dispatcher.sendEmail("c@example.com", "3", "b"));  // queue full: dropped

        release.countDown();
        dispatcher.shutdown();
        verify(email, never()).sendEmail(eq("c@example.com"), anyString(), anyString());
    }

    @Test
    void shutdownDrainsWhatIsAlreadyQueued() throws Exception {
        EmailService email = mock(EmailService.class);
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, pool(1, 10), 5);
        for (int i = 0; i < 5; i++) {
            assertTrue(dispatcher.sendEmail("u" + i + "@example.com", "s", "b"));
        }

        dispatcher.shutdown();

        verify(email, times(5)).sendEmail(anyString(), anyString(), anyString());
    }

    @Test
    void afterShutdownNewNotificationsAreDroppedNotThrown() {
        EmailService email = mock(EmailService.class);
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, pool(1, 5), 5);
        dispatcher.shutdown();

        assertFalse(dispatcher.sendEmail("late@example.com", "s", "b"));
    }

    @Test
    void logsMaskTheAddress() {
        assertEquals("j***@example.com", NotificationDispatcher.mask("jane@example.com"));
        assertEquals("***", NotificationDispatcher.mask("x@example.com"));
    }
}
