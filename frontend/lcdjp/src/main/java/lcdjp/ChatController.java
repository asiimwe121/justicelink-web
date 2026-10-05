package lcdjp;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.time.LocalDateTime;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/auth/chat")
public class ChatController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(ChatController.class);
    private static final int MESSAGE_HISTORY_CAP = 1000;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String getStringFromMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }
        return value.toString();
    }

    private boolean getBooleanFromMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof String) {
            return Boolean.parseBoolean((String) value);
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        return false;
    }

    @PostMapping("/messages")
    public ResponseEntity<?> sendChatMessage(@Valid @RequestBody ChatMessageRequest messageData,
                                             HttpServletRequest request) {
        try {

            String fromUser = authenticatedUsername();
            if (fromUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String fromName = messageData.getFromName();
            String fromRole = messageData.getFromRole();
            String sentTo = messageData.getSentTo();
            String message = messageData.getMessage();
            String type = messageData.getType();
            String audioData = messageData.getAudioData();
            Integer duration = messageData.getDuration() == null ? 0 : messageData.getDuration();
            String reply = messageData.getReply();
            String replyTimestamp = messageData.getReplyTimestamp();
            String timestamp = messageData.getTimestamp();
            boolean isRead = Boolean.TRUE.equals(messageData.getIsRead());
            boolean delivered = Boolean.TRUE.equals(messageData.getDelivered());

            if (type == null) type = "text";

            Map<String, Object> sender = userRow(fromUser);
            String senderRole = getStringFromMap(sender, "role");
            String senderDistrict = getStringFromMap(sender, "district");
            String normalizedSenderRole = senderRole == null ? "" :
                    senderRole.trim().toUpperCase().replace(' ', '_');
            boolean senderIsAdmin = isAdministrator(fromUser);

            boolean sentToIsRealUser = sentTo != null && !sentTo.isBlank()
                    && jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, sentTo) > 0;

            if (senderIsAdmin && sentToIsRealUser) {

            } else if (normalizedSenderRole.equals("DISTRICT_ADMIN")) {

                sentTo = resolveSystemAdminRecipient();
            } else {
                sentTo = resolveCustomerCareRecipient(fromUser, senderDistrict);
            }
            fromName = getStringFromMap(sender, "first_name") + " "
                    + getStringFromMap(sender, "last_name");
            fromRole = senderRole;

            String formattedTimestamp;
            if (timestamp != null) {
                try {
                    String cleaned = timestamp.replace("Z", "");
                    if (cleaned.contains(".")) cleaned = cleaned.substring(0, cleaned.indexOf("."));
                    formattedTimestamp = cleaned.replace("T", " ");
                } catch (Exception e) {
                    formattedTimestamp = LocalDateTime.now().toString().replace("T", " ");
                }
            } else {
                formattedTimestamp = LocalDateTime.now().toString().replace("T", " ");
            }


            String sql = "INSERT INTO chat_messages " +
                    "(from_user, from_name, from_role, sent_to, message, type, audio_data, " +
                    "duration, timestamp, reply, reply_timestamp, is_read, delivered) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            jdbcTemplate.update(sql,
                    fromUser, fromName, fromRole, sentTo,
                    message, type, audioData, duration,
                    formattedTimestamp, reply, replyTimestamp,
                    isRead, delivered);

            logger.info("✅ Chat message saved from: " + fromUser + " → " + sentTo);

            if (!"admin".equalsIgnoreCase(fromUser)) {
                createAdminNotification(sentTo, fromUser, fromName, fromRole, message, type);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Message sent",
                    "recipient", sentTo == null ? "" : sentTo
            ));

        } catch (Exception e) {
            logger.error("❌ Error sending chat message: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send message. Please try again later."));
        }
    }

    @GetMapping("/messages/user/{username}")
    public ResponseEntity<?> getUserChatMessages(@PathVariable String username) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String requestedUsername = isAdministrator(actor) ? username : actor;
            String sql = "SELECT * FROM (" +
                    "SELECT * FROM chat_messages WHERE from_user = ? OR sent_to = ? " +
                    "ORDER BY timestamp DESC LIMIT ?" +
                    ") recent ORDER BY timestamp ASC";
            List<Map<String, Object>> messages = jdbcTemplate.queryForList(
                    sql, requestedUsername, requestedUsername, MESSAGE_HISTORY_CAP);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            logger.error("❌ Error fetching chat messages: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/messages/admin")
    public ResponseEntity<?> getAllAdminMessages() {
        try {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Administrator access required"));
            }

            String sql = "SELECT cm.* FROM chat_messages cm WHERE " +
                    "cm.sent_to = 'admin' OR cm.from_user = 'admin' OR " +
                    "EXISTS (SELECT 1 FROM users u WHERE u.username = cm.sent_to AND " +
                    "REPLACE(UPPER(u.role), ' ', '_') IN ('ADMIN','SYSTEM_ADMIN','SYSTEM_ADMINISTRATOR')) OR " +
                    "EXISTS (SELECT 1 FROM users u WHERE u.username = cm.from_user AND " +
                    "REPLACE(UPPER(u.role), ' ', '_') IN ('ADMIN','SYSTEM_ADMIN','SYSTEM_ADMINISTRATOR')) " +
                    "ORDER BY cm.timestamp DESC LIMIT ?";
            List<Map<String, Object>> messages = jdbcTemplate.queryForList(sql, MESSAGE_HISTORY_CAP);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            logger.error("❌ Error fetching admin messages: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @PutMapping("/messages/{messageId}/read")
    public ResponseEntity<?> markChatMessageAsRead(@PathVariable Integer messageId) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!isAdministrator(actor)) {
                Integer owned = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM chat_messages WHERE id = ? AND sent_to = ?",
                        Integer.class, messageId, actor);
                if (owned == null || owned == 0) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You may only update messages sent to you"));
                }
            }
            String sql = "UPDATE chat_messages SET is_read = true WHERE id = ?";
            int updated = jdbcTemplate.update(sql, messageId);
            if (updated > 0) {
                return ResponseEntity.ok(Map.of("success", true));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Message not found"));
        } catch (Exception e) {
            logger.error("❌ Error marking message as read: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark message as read"));
        }
    }

    @PutMapping("/messages/mark-admin-read")
    public ResponseEntity<?> markAdminMessagesAsRead(@Valid @RequestBody MarkMessagesReadRequest request) {
        try {
            String username = authenticatedUsername();
            if (username == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (isAdministrator(username)) {
                if (request.getUsername() != null && !request.getUsername().isBlank()) {
                    username = request.getUsername();
                }
            }
            String sql = "UPDATE chat_messages SET is_read = true " +
                    "WHERE from_user = 'admin' AND sent_to = ? AND is_read = false";
            int updated = jdbcTemplate.update(sql, username);
            return ResponseEntity.ok(Map.of("success", true, "count", updated));
        } catch (Exception e) {
            logger.error("❌ Error marking admin messages as read: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark messages as read"));
        }
    }

    @GetMapping("/admin-online")
    public ResponseEntity<?> checkAdminOnline() {
        try {
            String sql = "SELECT COUNT(*) FROM users WHERE role = 'Admin' OR role = 'System Administrator'";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            return ResponseEntity.ok(Map.of("online", count != null && count > 0));
        } catch (Exception e) {
            logger.error("❌ Error checking admin status: " + e.getMessage());
            return ResponseEntity.ok(Map.of("online", false));
        }
    }

    private void createAdminNotification(String recipient, String fromUser, String fromName,
                                         String fromRole, String message, String type) {
        try {
            String notificationMessage = "New message from " + (fromName != null ? fromName : fromUser) +
                    " (" + (fromRole != null ? fromRole : "User") + "): " +
                    (message != null ? message.substring(0, Math.min(100, message.length())) : "");

            String sql = "INSERT INTO notifications (username, message, type, sender, sender_name, sender_role, message_text, timestamp) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
             jdbcTemplate.update(sql, recipient, notificationMessage, "chat",
                     fromUser, fromName, fromRole, message);

            logger.info("✅ Admin notification created for message from: " + fromUser);

        } catch (Exception e) {
            logger.error("❌ Error creating admin notification: ", e);
        }
    }

    private String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;

        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            String username = ((User) principal).getUsername();
            return username == null || username.isBlank() ? null : username;
        }

        String name = authentication.getName();
        return name == null || name.isBlank() || "anonymousUser".equals(name) ? null : name;
    }

    private Map<String, Object> userRow(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, first_name, last_name, role, district FROM users WHERE username = ?",
                username);
        return rows.isEmpty() ? Map.of("username", username) : rows.get(0);
    }

    private boolean isAdministrator(String username) {
        String role = getStringFromMap(userRow(username), "role");
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                || normalized.equals("SYSTEM_ADMINISTRATOR")
                || normalized.equals("DISTRICT_ADMIN");
    }

    private String resolveCustomerCareRecipient(String fromUser, String district) {
        String districtAdmin = resolveDistrictAdminRecipient(district);

        if (districtAdmin == null) {
            String systemAdmin = resolveSystemAdminRecipient();
            String prior = resolveExistingConversationRecipient(fromUser);
            return (prior != null && isSystemAdminAccount(prior)) ? prior : systemAdmin;
        }

        String prior = resolveExistingConversationRecipient(fromUser);
        if (prior != null && isDistrictAdminFor(prior, district)) {
            return prior;
        }

        if (prior != null && isSystemAdminAccount(prior)) {
            handOverPendingThread(fromUser, prior, districtAdmin);
        }
        return districtAdmin;
    }

    private String resolveDistrictAdminRecipient(String district) {
        if (district == null || district.isBlank()) return null;
        try {
            List<Map<String, Object>> districtAdmins = jdbcTemplate.queryForList(
                    "SELECT username FROM users WHERE " +
                            "REPLACE(UPPER(TRIM(role)), ' ', '_') = 'DISTRICT_ADMIN' " +
                            "AND (approval_status = 'Approved' OR approval_status IS NULL) " +
                            "AND (is_active IS NULL OR is_active = 1) " +
                            "AND UPPER(TRIM(district)) = UPPER(TRIM(?)) " +
                            "ORDER BY username LIMIT 1",
                    district);
            return districtAdmins.isEmpty() ? null
                    : getStringFromMap(districtAdmins.get(0), "username");
        } catch (Exception e) {
            logger.error("Error resolving district admin for '{}': {}", district, e.getMessage());
            return null;
        }
    }

    private boolean isDistrictAdminFor(String username, String district) {
        if (username == null || district == null || district.isBlank()) return false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE username = ? " +
                            "AND REPLACE(UPPER(TRIM(role)), ' ', '_') = 'DISTRICT_ADMIN' " +
                            "AND (approval_status = 'Approved' OR approval_status IS NULL) " +
                            "AND (is_active IS NULL OR is_active = 1) " +
                            "AND UPPER(TRIM(district)) = UPPER(TRIM(?))",
                    Integer.class, username, district);
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isSystemAdminAccount(String username) {
        if (username == null) return false;
        if ("admin".equalsIgnoreCase(username)) return true;
        String role = getStringFromMap(userRow(username), "role");
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                || normalized.equals("SYSTEM_ADMINISTRATOR");
    }

    private void handOverPendingThread(String fromUser, String previousRecipient,
                                       String newRecipient) {
        if (fromUser == null || previousRecipient == null || newRecipient == null) return;
        if (previousRecipient.equalsIgnoreCase(newRecipient)) return;
        try {
            Integer replies = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM chat_messages WHERE from_user = ? AND sent_to = ?",
                    Integer.class, previousRecipient, fromUser);
            if (replies != null && replies > 0) return;

            int moved = jdbcTemplate.update(
                    "UPDATE chat_messages SET sent_to = ? WHERE from_user = ? AND sent_to = ?",
                    newRecipient, fromUser, previousRecipient);
            if (moved > 0) {
                logger.info("Handed over {} unanswered support message(s) from {}: {} -> {}",
                        moved, fromUser, previousRecipient, newRecipient);
            }
        } catch (Exception e) {
            logger.warn("Could not hand over support thread for {}: {}", fromUser, e.getMessage());
        }
    }

    private String resolveExistingConversationRecipient(String fromUser) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT sent_to FROM chat_messages WHERE from_user = ? AND sent_to IS NOT NULL " +
                            "ORDER BY timestamp DESC LIMIT 1",
                    fromUser);
            if (rows.isEmpty()) return null;

            String priorRecipient = getStringFromMap(rows.get(0), "sent_to");
            if (priorRecipient == null || priorRecipient.isBlank()) return null;

            Integer stillValid = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE username = ? AND " +
                            "(approval_status = 'Approved' OR approval_status IS NULL)",
                    Integer.class, priorRecipient);
            return (stillValid != null && stillValid > 0) ? priorRecipient : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveSystemAdminRecipient() {
        List<Map<String, Object>> systemAdmins = jdbcTemplate.queryForList(
                "SELECT username FROM users WHERE role IN ('Admin', 'SYSTEM_ADMIN', " +
                        "'System Administrator') ORDER BY username LIMIT 1");
        return systemAdmins.isEmpty() ? "admin" : getStringFromMap(systemAdmins.get(0), "username");
    }
}