package lcdjp.chat;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** SQL for chat_messages (and the chat notification / routing lookups) that ChatController used to run itself. */
@Repository
public class ChatRepository {

    private static final String APPROVED_DISTRICT_ADMIN =
            "REPLACE(UPPER(TRIM(role)), ' ', '_') = 'DISTRICT_ADMIN' " +
                    "AND (approval_status = 'Approved' OR approval_status IS NULL) " +
                    "AND (is_active IS NULL OR is_active = 1) " +
                    "AND UPPER(TRIM(district)) = UPPER(TRIM(?))";

    private final JdbcTemplate jdbcTemplate;

    public ChatRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ---- messages -------------------------------------------------------------------------------------------

    public void insertMessage(String fromUser, String fromName, String fromRole, String sentTo, String message,
                              String type, String audioData, Integer duration, String timestamp, String reply,
                              String replyTimestamp, boolean isRead, boolean delivered) {
        jdbcTemplate.update(
                "INSERT INTO chat_messages " +
                        "(from_user, from_name, from_role, sent_to, message, type, audio_data, " +
                        "duration, timestamp, reply, reply_timestamp, is_read, delivered) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                fromUser, fromName, fromRole, sentTo, message, type, audioData, duration,
                timestamp, reply, replyTimestamp, isRead, delivered);
    }

    /** The newest {@code limit} messages to or from the user, oldest first. */
    public List<Map<String, Object>> findConversation(String username, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM (" +
                        "SELECT * FROM chat_messages WHERE from_user = ? OR sent_to = ? " +
                        "ORDER BY timestamp DESC LIMIT ?" +
                        ") recent ORDER BY timestamp ASC",
                username, username, limit);
    }

    /** The newest {@code limit} messages that involve the shared admin inbox, newest first. */
    public List<Map<String, Object>> findAdminMessages(int limit) {
        return jdbcTemplate.queryForList(
                "SELECT cm.* FROM chat_messages cm WHERE " +
                        "cm.sent_to = 'admin' OR cm.from_user = 'admin' OR " +
                        "EXISTS (SELECT 1 FROM users u WHERE u.username = cm.sent_to AND " +
                        "REPLACE(UPPER(u.role), ' ', '_') IN ('ADMIN','SYSTEM_ADMIN','SYSTEM_ADMINISTRATOR')) OR " +
                        "EXISTS (SELECT 1 FROM users u WHERE u.username = cm.from_user AND " +
                        "REPLACE(UPPER(u.role), ' ', '_') IN ('ADMIN','SYSTEM_ADMIN','SYSTEM_ADMINISTRATOR')) " +
                        "ORDER BY cm.timestamp DESC LIMIT ?",
                limit);
    }

    public boolean isMessageSentTo(Integer messageId, String username) {
        Integer owned = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM chat_messages WHERE id = ? AND sent_to = ?",
                Integer.class, messageId, username);
        return owned != null && owned > 0;
    }

    /** Returns the rows changed (0 when the message does not exist). */
    public int markRead(Integer messageId) {
        return jdbcTemplate.update("UPDATE chat_messages SET is_read = true WHERE id = ?", messageId);
    }

    /** Marks the admin's unread replies to this user as read; returns how many changed. */
    public int markAdminRepliesRead(String username) {
        return jdbcTemplate.update(
                "UPDATE chat_messages SET is_read = true " +
                        "WHERE from_user = 'admin' AND sent_to = ? AND is_read = false",
                username);
    }

    // ---- routing --------------------------------------------------------------------------------------------

    /** The most recent recipient this user wrote to, or null when they have never sent anything. */
    public String findLastRecipient(String fromUser) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT sent_to FROM chat_messages WHERE from_user = ? AND sent_to IS NOT NULL " +
                        "ORDER BY timestamp DESC LIMIT 1",
                fromUser);
        if (rows.isEmpty()) return null;
        Object sentTo = rows.get(0).get("sent_to");
        return sentTo == null ? null : sentTo.toString();
    }

    /** True when {@code from} has already written at least one message to {@code to}. */
    public boolean hasMessageFromTo(String from, String to) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM chat_messages WHERE from_user = ? AND sent_to = ?",
                Integer.class, from, to);
        return count != null && count > 0;
    }

    /** Re-addresses this user's messages from one recipient to another; returns how many moved. */
    public int reassignThread(String fromUser, String previousRecipient, String newRecipient) {
        return jdbcTemplate.update(
                "UPDATE chat_messages SET sent_to = ? WHERE from_user = ? AND sent_to = ?",
                newRecipient, fromUser, previousRecipient);
    }

    // ---- users ----------------------------------------------------------------------------------------------

    /** username, first_name, last_name, role and district, or null when there is no such user. */
    public Map<String, Object> findUserSummary(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, first_name, last_name, role, district FROM users WHERE username = ?",
                username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public boolean userExists(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
        return count != null && count > 0;
    }

    /** True when the user exists and is approved (or has no approval status). */
    public boolean isApprovedUser(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ? AND " +
                        "(approval_status = 'Approved' OR approval_status IS NULL)",
                Integer.class, username);
        return count != null && count > 0;
    }

    /** First approved, active district admin of the district (by username), or null. */
    public String findDistrictAdminUsername(String district) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username FROM users WHERE " + APPROVED_DISTRICT_ADMIN + " ORDER BY username LIMIT 1",
                district);
        if (rows.isEmpty()) return null;
        Object username = rows.get(0).get("username");
        return username == null ? null : username.toString();
    }

    public boolean isApprovedDistrictAdminFor(String username, String district) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ? AND " + APPROVED_DISTRICT_ADMIN,
                Integer.class, username, district);
        return count != null && count > 0;
    }

    /** True when any account has the Admin or System Administrator role. */
    public boolean adminAccountExists() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE role = 'Admin' OR role = 'System Administrator'", Integer.class);
        return count != null && count > 0;
    }

    // ---- notifications --------------------------------------------------------------------------------------

    public void insertChatNotification(String recipient, String notificationMessage, String fromUser,
                                       String fromName, String fromRole, String messageText) {
        jdbcTemplate.update(
                "INSERT INTO notifications (username, message, type, sender, sender_name, sender_role, " +
                        "message_text, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                recipient, notificationMessage, "chat", fromUser, fromName, fromRole, messageText);
    }
}
