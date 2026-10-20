package lcdjp.notification;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

/** SQL for the email_outbox table (see V11__email_outbox.sql). */
@Repository
public class EmailOutboxRepository {

    /** After this many failed attempts a row becomes FAILED and is kept for a while for inspection, then purged. */
    public static final int MAX_ATTEMPTS = 6;

    /** A freshly queued row is not picked up by the retry job for this long: the normal send path gets first go. */
    static final long FIRST_ATTEMPT_GRACE_SECONDS = 120;

    public record Row(long id, String to, String subject, String body, int attempts) {}

    private final JdbcTemplate jdbcTemplate;

    public EmailOutboxRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Stores an email as PENDING and returns its id. */
    public long enqueue(String to, String subject, String body) {
        LocalDateTime now = LocalDateTime.now();
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO email_outbox (to_address, subject, body, status, attempts, next_attempt_at, created_at) "
                            + "VALUES (?, ?, ?, 'PENDING', 0, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, to);
            ps.setString(2, truncate(subject, 500));
            ps.setString(3, body == null ? "" : body);
            ps.setTimestamp(4, Timestamp.valueOf(now.plusSeconds(FIRST_ATTEMPT_GRACE_SECONDS)));
            ps.setTimestamp(5, Timestamp.valueOf(now));
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new IllegalStateException("email_outbox insert returned no id");
        }
        return key.longValue();
    }

    public void markSent(long id) {
        jdbcTemplate.update("UPDATE email_outbox SET status = 'SENT', sent_at = ?, last_error = NULL WHERE id = ?",
                Timestamp.valueOf(LocalDateTime.now()), id);
    }

    /**
     * Records a failed attempt. {@code attemptsSoFar} is the count before this failure. Backoff: 1, 2, 4, 8, 16, 32 minutes,
     * capped at one hour. The status assignment comes BEFORE the attempts increment on purpose: MySQL evaluates SET
     * clauses left to right, so it must read the old value.
     */
    public void markFailedAttempt(long id, int attemptsSoFar, String error) {
        long delaySeconds = Math.min(3600L, 60L << Math.min(attemptsSoFar, 6));
        jdbcTemplate.update("UPDATE email_outbox SET status = CASE WHEN attempts + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END, "
                        + "attempts = attempts + 1, last_error = ?, next_attempt_at = ? WHERE id = ?",
                MAX_ATTEMPTS, truncate(error, 500), Timestamp.valueOf(LocalDateTime.now().plusSeconds(delaySeconds)), id);
    }

    /** PENDING rows whose time has come, oldest first. */
    public List<Row> findDue(int limit) {
        return jdbcTemplate.query(
                "SELECT id, to_address, subject, body, attempts FROM email_outbox "
                        + "WHERE status = 'PENDING' AND next_attempt_at <= ? ORDER BY id LIMIT ?",
                (rs, n) -> new Row(rs.getLong("id"), rs.getString("to_address"), rs.getString("subject"),
                        rs.getString("body"), rs.getInt("attempts")),
                Timestamp.valueOf(LocalDateTime.now()), limit);
    }

    /**
     * Takes a due row by pushing its next attempt into the future. Only one caller gets true, so two instances (or
     * a slow send and the next run) never send the same row twice at the same time.
     */
    public boolean claim(long id, int leaseSeconds) {
        LocalDateTime now = LocalDateTime.now();
        return jdbcTemplate.update("UPDATE email_outbox SET next_attempt_at = ? "
                        + "WHERE id = ? AND status = 'PENDING' AND next_attempt_at <= ?",
                Timestamp.valueOf(now.plusSeconds(leaseSeconds)), id, Timestamp.valueOf(now)) == 1;
    }

    /** Deletes SENT rows older than {@code sentDays} and FAILED rows older than {@code failedDays}; returns rows removed. */
    public int purge(int sentDays, int failedDays) {
        LocalDateTime now = LocalDateTime.now();
        int sent = jdbcTemplate.update("DELETE FROM email_outbox WHERE status = 'SENT' AND created_at < ?",
                Timestamp.valueOf(now.minusDays(sentDays)));
        int failed = jdbcTemplate.update("DELETE FROM email_outbox WHERE status = 'FAILED' AND created_at < ?",
                Timestamp.valueOf(now.minusDays(failedDays)));
        return sent + failed;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
