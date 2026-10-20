package lcdjp.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class LoginLockoutService {

    public static final int MAX_FAILED_ATTEMPTS = 3;
    public static final Duration LOCK_DURATION = Duration.ofHours(5);
    public static final Duration FAILURE_WINDOW = Duration.ofHours(24);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Value("${app.support.email:support@justicelinkug.org}")
    private String supportEmail;

    public static final class FailureResult {
        public final boolean locked;
        public final int attemptsRemaining;
        public final LocalDateTime lockedUntil;

        public FailureResult(boolean locked, int attemptsRemaining, LocalDateTime lockedUntil) {
            this.locked = locked;
            this.attemptsRemaining = attemptsRemaining;
            this.lockedUntil = lockedUntil;
        }
    }

    public String getSupportEmail() {
        return supportEmail;
    }

    static String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    public LocalDateTime lockedUntil(String username) {
        String key = normalize(username);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT locked_until FROM login_lockouts WHERE username = ?", key);
        if (rows.isEmpty()) {
            return null;
        }
        LocalDateTime until = toLocalDateTime(rows.get(0).get("locked_until"));
        if (until == null) {
            return null;
        }
        if (until.isAfter(LocalDateTime.now())) {
            return until;
        }
        jdbcTemplate.update("DELETE FROM login_lockouts WHERE username = ?", key);
        return null;
    }

    public boolean isLocked(String username) {
        return lockedUntil(username) != null;
    }

    public FailureResult recordFailure(String username) {
        String key = normalize(username);
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.update(
                "DELETE FROM login_lockouts WHERE (locked_until IS NULL AND last_failed_at < ?) "
                        + "OR (locked_until IS NOT NULL AND locked_until < ?)",
                now.minus(FAILURE_WINDOW), now);

        String bump = "UPDATE login_lockouts SET failed_attempts = failed_attempts + 1, last_failed_at = ? "
                + "WHERE username = ?";
        if (jdbcTemplate.update(bump, now, key) == 0) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO login_lockouts (username, failed_attempts, last_failed_at) VALUES (?, 1, ?)",
                        key, now);
            } catch (DuplicateKeyException raced) {
                jdbcTemplate.update(bump, now, key);
            }
        }

        int attempts = MAX_FAILED_ATTEMPTS;
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT failed_attempts FROM login_lockouts WHERE username = ?", key);
        if (!rows.isEmpty() && rows.get(0).get("failed_attempts") instanceof Number) {
            attempts = ((Number) rows.get(0).get("failed_attempts")).intValue();
        }

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            LocalDateTime until = now.plus(LOCK_DURATION);
            jdbcTemplate.update(
                    "UPDATE login_lockouts SET locked_until = ? WHERE username = ? AND locked_until IS NULL",
                    until, key);
            LocalDateTime effective = lockedUntil(key);
            return new FailureResult(true, 0, effective != null ? effective : until);
        }
        return new FailureResult(false, MAX_FAILED_ATTEMPTS - attempts, null);
    }

    public void recordSuccess(String username) {
        jdbcTemplate.update("DELETE FROM login_lockouts WHERE username = ?", normalize(username));
    }

    public boolean unlock(String username) {
        return jdbcTemplate.update("DELETE FROM login_lockouts WHERE username = ?", normalize(username)) > 0;
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value instanceof LocalDateTime) {
            return (LocalDateTime) value;
        }
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime();
        }
        if (value instanceof java.util.Date) {
            return new Timestamp(((java.util.Date) value).getTime()).toLocalDateTime();
        }
        return null;
    }
}
