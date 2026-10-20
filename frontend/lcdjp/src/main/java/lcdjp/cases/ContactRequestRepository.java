package lcdjp.cases;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** SQL for contact requests between users (and the notifications their outcome produces). */
@Repository
public class ContactRequestRepository {

    private final JdbcTemplate jdbcTemplate;

    public ContactRequestRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** The table predates the Flyway baseline on some installs, so callers still check before using it. */
    public boolean tableExists() {
        return !jdbcTemplate.queryForList("SHOW TABLES LIKE 'contact_requests'").isEmpty();
    }

    /** Pending requests addressed to {@code username}, newest first. */
    public List<Map<String, Object>> findPendingFor(String username, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM contact_requests WHERE recipient = ? AND status = 'pending' "
                        + "ORDER BY created_at DESC LIMIT ?", username, limit);
    }

    /** Requests sent by {@code username}, newest first. */
    public List<Map<String, Object>> findSentBy(String username, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM contact_requests WHERE sender = ? ORDER BY created_at DESC LIMIT ?",
                username, limit);
    }

    /** Requests {@code username} sent or received, newest first. */
    public List<Map<String, Object>> findInvolving(String username, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM contact_requests WHERE sender = ? OR recipient = ? ORDER BY created_at DESC LIMIT ?",
                username, username, limit);
    }

    /** @return one row holding "sender" and "recipient", or null when there is no such request. */
    public Map<String, Object> findParties(Integer requestId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT sender, recipient FROM contact_requests WHERE id = ?", requestId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public void insertPending(String sender, String recipient, String message) {
        jdbcTemplate.update(
                "INSERT INTO contact_requests (sender, recipient, message, status, created_at) "
                        + "VALUES (?, ?, ?, 'pending', NOW())", sender, recipient, message);
    }

    public void markAccepted(Integer requestId) {
        jdbcTemplate.update(
                "UPDATE contact_requests SET status = 'accepted', updated_at = NOW() WHERE id = ?", requestId);
    }

    public void markDenied(Integer requestId) {
        jdbcTemplate.update(
                "UPDATE contact_requests SET status = 'denied', updated_at = NOW() WHERE id = ?", requestId);
    }

    /** @return rows deleted; 0 means the request no longer exists. */
    public int delete(Integer requestId) {
        return jdbcTemplate.update("DELETE FROM contact_requests WHERE id = ?", requestId);
    }

    public void notifyAccepted(String senderUsername, String messageText) {
        jdbcTemplate.update(
                "INSERT INTO notifications (username, type, message_text, is_read, timestamp) "
                        + "VALUES (?, 'contact_accepted', ?, false, NOW())", senderUsername, messageText);
    }

    public void notifyDenied(String senderUsername, String messageText) {
        jdbcTemplate.update(
                "INSERT INTO notifications (username, type, message_text, is_read, timestamp) "
                        + "VALUES (?, 'contact_denied', ?, false, NOW())", senderUsername, messageText);
    }
}
