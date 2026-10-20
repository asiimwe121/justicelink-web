package lcdjp.notification;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EmailOutboxTest {

    private static ThreadPoolExecutor pool(int threads, int queue) {
        return new ThreadPoolExecutor(threads, threads, 1, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(queue), new ThreadPoolExecutor.AbortPolicy());
    }

    // ---- repository -------------------------------------------------------------------------------------------

    @Test
    void enqueueReturnsTheGeneratedId() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        doAnswer(inv -> {
            KeyHolder keys = inv.getArgument(1);
            keys.getKeyList().add(Map.of("id", 42L));
            return 1;
        }).when(jdbc).update(any(PreparedStatementCreator.class), any(KeyHolder.class));

        assertEquals(42L, new EmailOutboxRepository(jdbc).enqueue("a@example.com", "s", "b"));
    }

    @Test
    void claimOnlySucceedsWhenARowWasUpdated() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(contains("SET next_attempt_at"), any(), eq(7L), any())).thenReturn(1, 0);
        EmailOutboxRepository repo = new EmailOutboxRepository(jdbc);

        assertTrue(repo.claim(7L, 300));
        assertFalse(repo.claim(7L, 300));
    }

    @Test
    void failureUpdateReadsTheOldAttemptCountForTheStatus() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        new EmailOutboxRepository(jdbc).markFailedAttempt(3L, 2, "boom");

        org.mockito.ArgumentCaptor<String> sql = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(sql.capture(), eq(EmailOutboxRepository.MAX_ATTEMPTS), eq("boom"), any(), eq(3L));
        assertTrue(sql.getValue().indexOf("status = CASE") < sql.getValue().indexOf("attempts = attempts + 1"),
                "status must be assigned before attempts is incremented (MySQL evaluates SET left to right)");
    }

    // ---- dispatcher with an outbox ---------------------------------------------------------------------------

    @Test
    void emailIsStoredThenMarkedSentAfterDelivery() throws Exception {
        EmailService email = mock(EmailService.class);
        EmailOutboxRepository outbox = mock(EmailOutboxRepository.class);
        when(outbox.enqueue("jane@example.com", "Hi", "b")).thenReturn(9L);
        CountDownLatch marked = new CountDownLatch(1);
        doAnswer(inv -> { marked.countDown(); return null; }).when(outbox).markSent(9L);
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, outbox, pool(1, 5), 5);

        assertTrue(dispatcher.sendEmail("jane@example.com", "Hi", "b"));

        assertTrue(marked.await(5, TimeUnit.SECONDS));
        verify(email).sendEmail("jane@example.com", "Hi", "b");
        dispatcher.shutdown();
    }

    @Test
    void failedDeliveryStaysInTheOutboxForRetry() throws Exception {
        EmailService email = mock(EmailService.class);
        doThrow(new IOException("brevo down")).when(email).sendEmail(anyString(), anyString(), anyString());
        EmailOutboxRepository outbox = mock(EmailOutboxRepository.class);
        when(outbox.enqueue(anyString(), anyString(), anyString())).thenReturn(5L);
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, outbox, pool(1, 5), 5);

        assertTrue(dispatcher.sendEmail("jane@example.com", "Hi", "b"));
        dispatcher.shutdown();

        verify(outbox).markFailedAttempt(eq(5L), eq(0), contains("brevo down"));
        verify(outbox, never()).markSent(anyLong());
    }

    @Test
    void fullQueueDoesNotLoseTheEmailWhenItIsInTheOutbox() throws Exception {
        EmailService email = mock(EmailService.class);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);
        doAnswer(inv -> { started.countDown(); release.await(10, TimeUnit.SECONDS); return null; })
                .when(email).sendEmail(anyString(), anyString(), anyString());
        EmailOutboxRepository outbox = mock(EmailOutboxRepository.class);
        when(outbox.enqueue(anyString(), anyString(), anyString())).thenReturn(1L, 2L, 3L);
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, outbox, pool(1, 1), 5);

        assertTrue(dispatcher.sendEmail("a@example.com", "1", "b"));
        assertTrue(started.await(5, TimeUnit.SECONDS));
        assertTrue(dispatcher.sendEmail("b@example.com", "2", "b"));
        assertTrue(dispatcher.sendEmail("c@example.com", "3", "b"), "stored in the outbox, so it is not dropped");

        release.countDown();
        dispatcher.shutdown();
        verify(email, never()).sendEmail(eq("c@example.com"), anyString(), anyString());
        verify(outbox, never()).markSent(3L);
    }

    @Test
    void outboxWriteFailureFallsBackToInMemorySending() throws Exception {
        EmailService email = mock(EmailService.class);
        EmailOutboxRepository outbox = mock(EmailOutboxRepository.class);
        when(outbox.enqueue(anyString(), anyString(), anyString())).thenThrow(new RuntimeException("table missing"));
        NotificationDispatcher dispatcher = new NotificationDispatcher(email, outbox, pool(1, 5), 5);

        assertTrue(dispatcher.sendEmail("jane@example.com", "Hi", "b"));
        dispatcher.shutdown();

        verify(email).sendEmail("jane@example.com", "Hi", "b");
    }

    // ---- drainer ---------------------------------------------------------------------------------------------

    @Test
    void drainerSendsClaimedRowsAndRecordsFailures() throws Exception {
        EmailService email = mock(EmailService.class);
        doThrow(new IOException("still down")).when(email).sendEmail(eq("bad@example.com"), anyString(), anyString());
        EmailOutboxRepository outbox = mock(EmailOutboxRepository.class);
        when(outbox.findDue(anyInt())).thenReturn(List.of(
                new EmailOutboxRepository.Row(1, "ok@example.com", "s", "b", 0),
                new EmailOutboxRepository.Row(2, "bad@example.com", "s", "b", 2),
                new EmailOutboxRepository.Row(3, "taken@example.com", "s", "b", 0)));
        when(outbox.claim(eq(1L), anyInt())).thenReturn(true);
        when(outbox.claim(eq(2L), anyInt())).thenReturn(true);
        when(outbox.claim(eq(3L), anyInt())).thenReturn(false);   // another instance took it

        int sent = new EmailOutboxDrainer(outbox, email).drainOnce();

        assertEquals(1, sent);
        verify(outbox).markSent(1L);
        verify(outbox).markFailedAttempt(eq(2L), eq(2), contains("still down"));
        verify(email, never()).sendEmail(eq("taken@example.com"), anyString(), anyString());
    }
}
