package lcdjp.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** SQL on the notifications table (and the role lookup it needs) that AuthNotificationController ran itself. */
@Repository
public class AuthNotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthNotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** The newest {@code limit} notifications for a username. */
    public List<Map<String, Object>> findLatest(String username, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM notifications WHERE username = ? ORDER BY timestamp DESC LIMIT ?", username, limit);
    }

    /** The user's role, or null when there is no such user. */
    public String findRole(String username) {
        List<String> roles = jdbcTemplate.queryForList(
                "SELECT role FROM users WHERE username = ?", String.class, username);
        return roles.isEmpty() ? null : roles.get(0);
    }

    public int countUnread(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE username = ? AND is_read = false", Integer.class, username);
        return count == null ? 0 : count;
    }

    /** Marks one notification in the shared admin inbox as read; returns the rows changed. */
    public int markReadInAdminInbox(Long id) {
        return jdbcTemplate.update(
                "UPDATE notifications SET is_read = true WHERE id = ? AND username = 'admin'", id);
    }

    /** Marks one of the user's own notifications as read (username compared case-insensitively, trimmed). */
    public int markReadForUser(Long id, String username) {
        return jdbcTemplate.update(
                "UPDATE notifications SET is_read = true WHERE id = ? AND LOWER(TRIM(username)) = LOWER(TRIM(?))",
                id, username);
    }

    public int markAllRead(String username) {
        return jdbcTemplate.update(
                "UPDATE notifications SET is_read = true WHERE username = ? AND is_read = false", username);
    }

    /** The notification's "username" and "is_read" columns, or null when the id does not exist. */
    public Map<String, Object> findOwnerAndReadFlag(Long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, is_read FROM notifications WHERE id = ?", id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Oldest district admin of the district, or null when there is none. */
    public String findDistrictAdminForSupport(String district) {
        List<Map<String, Object>> admins = jdbcTemplate.queryForList(
                "SELECT username FROM users WHERE district = ? AND role = 'DISTRICT_ADMIN' " +
                        "ORDER BY created_at ASC LIMIT 1", district);
        if (admins.isEmpty()) return null;
        Object username = admins.get(0).get("username");
        return username == null ? null : username.toString();
    }

    public void insertNotification(String username, String message, String type, String sender,
                                   String senderName, String senderRole) {
        jdbcTemplate.update(
                "INSERT INTO notifications (username, message, type, sender, sender_name, sender_role, is_read, timestamp) " +
                        "VALUES (?, ?, ?, ?, ?, ?, false, NOW())",
                username, message, type, sender, senderName, senderRole);
    }

    /** A CHAT notification for the admin inbox, sent by (and named after) the given citizen username. */
    public void insertAdminChatNotification(String adminUsername, String message, String citizenUsername) {
        jdbcTemplate.update(
                "INSERT INTO notifications (username, message, type, sender, sender_name, sender_role, is_read, timestamp) " +
                        "VALUES (?, ?, 'CHAT', ?, ?, 'Citizen', false, NOW())",
                adminUsername, message, citizenUsername, citizenUsername);
    }
}
