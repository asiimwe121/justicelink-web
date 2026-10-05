package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.Locale;

@Service
public class SessionRevocationService {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(SessionRevocationService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    static String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    public void revokeAll(String username) {
        String key = normalize(username);
        if (key.isEmpty()) {
            return;
        }
        long now = System.currentTimeMillis();
        int updated = jdbcTemplate.update(
                "UPDATE session_revocations SET revoked_at_ms = ? WHERE username = ?", now, key);
        if (updated == 0) {
            try {
                jdbcTemplate.update(
                        "INSERT INTO session_revocations (username, revoked_at_ms) VALUES (?, ?)", key, now);
            } catch (org.springframework.dao.DuplicateKeyException raced) {
                jdbcTemplate.update(
                        "UPDATE session_revocations SET revoked_at_ms = ? WHERE username = ?", now, key);
            }
        }
    }

    public boolean isRevoked(String username, Date issuedAt) {
        String key = normalize(username);
        if (key.isEmpty()) {
            return false;
        }
        try {
            List<Long> rows = jdbcTemplate.query(
                    "SELECT revoked_at_ms FROM session_revocations WHERE username = ?",
                    (rs, i) -> rs.getLong(1), key);
            if (rows.isEmpty()) {
                return false;
            }
            if (issuedAt == null) {
                return true;
            }
            long revokedSecond = Math.floorDiv(rows.get(0), 1000L);
            long issuedSecond = Math.floorDiv(issuedAt.getTime(), 1000L);
            return issuedSecond <= revokedSecond;
        } catch (RuntimeException e) {
            logger.error("Could not check session revocation for '{}': {}", key, e.getMessage());
            return false;
        }
    }
}
