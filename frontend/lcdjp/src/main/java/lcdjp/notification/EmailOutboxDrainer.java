package lcdjp.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Retries emails that are still PENDING in the outbox: ones whose first send failed, ones that did not fit in the
 * in-memory queue, and ones that were queued when the app stopped. Rows are claimed one by one
 * ({@link EmailOutboxRepository#claim}), so this is safe with several replicas and does not need Redis.
 */
@Component
public class EmailOutboxDrainer {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxDrainer.class);
    private static final int BATCH = 50;
    /** If the app dies mid-send the row becomes due again after this many seconds. */
    private static final int LEASE_SECONDS = 300;

    private final EmailOutboxRepository outbox;
    private final EmailService emailService;

    @Autowired
    public EmailOutboxDrainer(EmailOutboxRepository outbox, EmailService emailService) {
        this.outbox = outbox;
        this.emailService = emailService;
    }

    @Scheduled(fixedDelayString = "${app.outbox.drain-interval-ms:60000}", initialDelayString = "${app.outbox.initial-delay-ms:45000}")
    public void drain() {
        try {
            drainOnce();
        } catch (RuntimeException e) {
            log.warn("[outbox] drain run failed: {}", e.getMessage());
        }
    }

    /** One pass; returns how many emails were sent. */
    int drainOnce() {
        List<EmailOutboxRepository.Row> due = outbox.findDue(BATCH);
        int sent = 0;
        for (EmailOutboxRepository.Row row : due) {
            if (!outbox.claim(row.id(), LEASE_SECONDS)) {
                continue;
            }
            try {
                emailService.sendEmail(row.to(), row.subject(), row.body());
                outbox.markSent(row.id());
                sent++;
            } catch (Exception e) {
                outbox.markFailedAttempt(row.id(), row.attempts(), e.getClass().getSimpleName() + ": " + e.getMessage());
                log.warn("[outbox] retry {} of email {} to {} failed: {}", row.attempts() + 1, row.id(),
                        NotificationDispatcher.mask(row.to()), e.getMessage());
            }
        }
        if (sent > 0) {
            log.info("[outbox] sent {} queued email(s)", sent);
        }
        return sent;
    }

    @Scheduled(cron = "${app.outbox.purge-cron:0 40 3 * * *}")
    public void purge() {
        try {
            int removed = outbox.purge(3, 30);
            if (removed > 0) {
                log.info("[outbox] purged {} old row(s)", removed);
            }
        } catch (RuntimeException e) {
            log.warn("[outbox] purge failed: {}", e.getMessage());
        }
    }
}
