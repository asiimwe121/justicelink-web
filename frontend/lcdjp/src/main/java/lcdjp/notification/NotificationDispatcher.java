package lcdjp.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sends best-effort emails (login alert, welcome, approval) off the request thread, so a slow or
 * failing mail provider can no longer hold up, or fail, the request that triggered it.
 *
 * <p>Each email is first written to the {@code email_outbox} table (see {@link EmailOutboxRepository}), so it survives
 * a full queue, a failing provider or a restart: {@link EmailOutboxDrainer} retries whatever is still PENDING. The
 * pool and its queue are bounded and never block the request; without an outbox (unit tests) a full queue drops the
 * notification with a warning. On shutdown the queue is drained for up
 * to {@code app.notifications.drain-seconds} (default 30, which fits inside a 40-second container
 * stop grace period).
 *
 * <p>Do not use this for messages the user must be told failed (OTP codes, password reset): those
 * stay synchronous on {@link EmailService}.
 */
@Component
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    private final EmailService emailService;
    private final EmailOutboxRepository outbox;   // null = in-memory only (unit tests, or if the table is unavailable)
    private final ThreadPoolExecutor executor;
    private final long drainSeconds;

    @Autowired
    public NotificationDispatcher(
            EmailService emailService,
            EmailOutboxRepository outbox,
            @Value("${app.notifications.threads:2}") int threads,
            @Value("${app.notifications.queue-capacity:200}") int queueCapacity,
            @Value("${app.notifications.drain-seconds:30}") long drainSeconds) {
        this(emailService, outbox, newExecutor(threads, queueCapacity), drainSeconds);
    }

    NotificationDispatcher(EmailService emailService, ThreadPoolExecutor executor, long drainSeconds) {
        this(emailService, null, executor, drainSeconds);
    }

    NotificationDispatcher(EmailService emailService, EmailOutboxRepository outbox, ThreadPoolExecutor executor,
                           long drainSeconds) {
        this.emailService = emailService;
        this.outbox = outbox;
        this.executor = executor;
        this.drainSeconds = drainSeconds;
    }

    private static ThreadPoolExecutor newExecutor(int threads, int queueCapacity) {
        int size = Math.max(1, threads);
        AtomicInteger counter = new AtomicInteger();
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                size, size, 30L, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(Math.max(1, queueCapacity)),
                runnable -> new Thread(runnable, "notification-" + counter.incrementAndGet()),
                new ThreadPoolExecutor.AbortPolicy());
        pool.allowCoreThreadTimeOut(true);
        return pool;
    }

    /**
     * Queues an email. Returns immediately.
     *
     * @return true if queued; false if skipped (no recipient, queue full, or shutting down)
     */
    public boolean sendEmail(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return false;
        }
        Long outboxId = store(to, subject, body);
        try {
            executor.execute(() -> deliver(outboxId, to, subject, body));
            return true;
        } catch (RejectedExecutionException e) {
            if (outboxId != null) {
                // Not lost: the row stays PENDING and EmailOutboxDrainer sends it shortly.
                log.warn("[notifications] queue full or shutting down; email '{}' to {} left in the outbox for retry",
                        subject, mask(to));
                return true;
            }
            log.warn("[notifications] queue full or shutting down; dropped email '{}' to {}", subject, mask(to));
            return false;
        }
    }

    /** Writes the email to the outbox first; null when there is no outbox or the write failed (then it is in-memory only). */
    private Long store(String to, String subject, String body) {
        if (outbox == null) {
            return null;
        }
        try {
            return outbox.enqueue(to, subject, body);
        } catch (RuntimeException e) {
            log.warn("[notifications] could not write '{}' to the outbox, sending without durability: {}", subject, e.getMessage());
            return null;
        }
    }

    private void deliver(Long outboxId, String to, String subject, String body) {
        try {
            emailService.sendEmail(to, subject, body);
            log.info("[notifications] sent '{}' to {}", subject, mask(to));
            if (outboxId != null) {
                try {
                    outbox.markSent(outboxId);
                } catch (RuntimeException e) {
                    log.warn("[notifications] sent but could not mark outbox row {} as sent (it may be sent again): {}",
                            outboxId, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("[notifications] could not send '{}' to {}: {}", subject, mask(to), e.getMessage());
            if (outboxId != null) {
                try {
                    outbox.markFailedAttempt(outboxId, 0, e.getClass().getSimpleName() + ": " + e.getMessage());
                } catch (RuntimeException ex) {
                    log.warn("[notifications] could not record the failure for outbox row {}: {}", outboxId, ex.getMessage());
                }
            }
        }
    }

    int queued() {
        return executor.getQueue().size();
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(drainSeconds, TimeUnit.SECONDS)) {
                int dropped = executor.shutdownNow().size();
                log.warn("[notifications] drain timed out after {}s; {} queued email(s) dropped", drainSeconds, dropped);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            executor.shutdownNow();
        }
    }

    /** Keeps full addresses out of the logs. */
    static String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
