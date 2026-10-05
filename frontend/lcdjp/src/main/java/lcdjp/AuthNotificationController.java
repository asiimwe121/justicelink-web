package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthNotificationController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(AuthNotificationController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String username = authentication.getName();

        try {
            String sql = "SELECT * FROM notifications WHERE username = ? ORDER BY timestamp DESC LIMIT 50";
            List<Map<String, Object>> notifications = jdbcTemplate.queryForList(sql, username);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "notifications", notifications
            ));

        } catch (Exception e) {
            logger.error("❌ Notifications fetch error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch notifications. Please try again later."));
        }
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<?> markNotificationRead(@PathVariable Long id, Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String actor = authentication.getName();

        try {

            String role = null;
            try {
                role = jdbcTemplate.queryForObject(
                        "SELECT role FROM users WHERE username = ?", String.class, actor);
            } catch (Exception ignored) {
            }

            int updated;
            if (RoleAuthority.isSharedAdminInboxRole(role)) {
                updated = jdbcTemplate.update(
                        "UPDATE notifications SET is_read = true WHERE id = ? AND username = 'admin'", id);
            } else {

                updated = jdbcTemplate.update(
                        "UPDATE notifications SET is_read = true WHERE id = ? AND LOWER(TRIM(username)) = LOWER(TRIM(?))",
                        id, actor);
            }

            if (updated > 0) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Notification marked as read"
                ));
            }

            String ownerUsername = null;
            Boolean alreadyRead = null;
            try {
                Map<String, Object> row = jdbcTemplate.queryForMap(
                        "SELECT username, is_read FROM notifications WHERE id = ?", id);
                ownerUsername = (String) row.get("username");
                Object isReadVal = row.get("is_read");
                alreadyRead = (isReadVal instanceof Boolean) ? (Boolean) isReadVal
                        : (isReadVal != null && isReadVal.toString().equals("1"));
            } catch (Exception lookupEx) {

            }

            boolean belongsToActor = ownerUsername != null && (
                    RoleAuthority.isSharedAdminInboxRole(role)
                            ? "admin".equals(ownerUsername)
                            : ownerUsername.trim().equalsIgnoreCase(actor.trim())
            );

            if (belongsToActor && Boolean.TRUE.equals(alreadyRead)) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Notification already marked as read"
                ));
            }

            logger.warn("markNotificationRead 404: id={} actor=[{}] role={} storedUsername=[{}] alreadyRead={}",
                    id, actor, role, ownerUsername, alreadyRead);

            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Notification not found"));

        } catch (Exception e) {
            logger.error("❌ Error marking notification as read: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update notification. Please try again later."));
        }
    }

    @PutMapping("/notifications/mark-all-read/{username}")
    public ResponseEntity<?> markAllNotificationsAsRead(@PathVariable String username,
                                                        Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String actor = authentication.getName();
        String actorRole = null;
        try {
            actorRole = jdbcTemplate.queryForObject(
                    "SELECT role FROM users WHERE username = ?", String.class, actor);
        } catch (Exception ignored) {
        }
        if (!actor.equals(username) && !RoleAuthority.isSystemAdminRole(actorRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You may only mark your own notifications as read"));
        }

        try {
            int updated = jdbcTemplate.update(
                    "UPDATE notifications SET is_read = true WHERE username = ? AND is_read = false",
                    username);
            return ResponseEntity.ok(Map.of("success", true, "count", updated));
        } catch (Exception e) {
            logger.error("❌ Error marking all notifications as read: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark notifications as read"));
        }
    }

    @GetMapping("/notifications/unread/{username}")
    public ResponseEntity<?> getUnreadNotificationsCount(@PathVariable String username,
                                                         Authentication authentication) {
        try {

            String effectiveUsername = resolveNotificationUsername(username, authentication);
            String sql = "SELECT COUNT(*) FROM notifications WHERE username = ? AND is_read = false";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, effectiveUsername);
            return ResponseEntity.ok(Map.of("unreadCount", count != null ? count : 0));
        } catch (Exception e) {
            logger.error("Error getting unread notifications: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/notifications/user/{username}")
    public ResponseEntity<?> getUserNotifications(@PathVariable String username,
                                                  Authentication authentication) {
        try {

            String effectiveUsername = resolveNotificationUsername(username, authentication);
            String sql = "SELECT * FROM notifications WHERE username = ? ORDER BY timestamp DESC LIMIT 50";
            List<Map<String, Object>> notifications = jdbcTemplate.queryForList(sql, effectiveUsername);
            return ResponseEntity.ok(Map.of("success", true, "notifications", notifications));
        } catch (Exception e) {
            logger.error("Error getting user notifications: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    private String resolveNotificationUsername(String pathUsername, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return pathUsername;
        }
        String actor = authentication.getName();
        String role = null;
        try {
            role = jdbcTemplate.queryForObject(
                    "SELECT role FROM users WHERE username = ?", String.class, actor);
        } catch (Exception ignored) {
        }
        return RoleAuthority.isSharedAdminInboxRole(role) ? "admin" : pathUsername;
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> createNotification(@Valid @RequestBody NotificationCreateRequest request) {
        try {
            String username   = request.getUsername();
            String message    = request.getMessage();
            String type       = request.getType() == null ? "CHAT" : request.getType();
            String sender     = request.getSender() == null ? "system" : request.getSender();
            String senderName = request.getSenderName() == null ? "System" : request.getSenderName();
            String senderRole = request.getSenderRole() == null ? "System" : request.getSenderRole();
            String district   = request.getDistrict() == null ? "" : request.getDistrict();

            if ("chat".equalsIgnoreCase(type) && district != null && !district.isEmpty()) {
                try {
                    String findAdminSql =
                            "SELECT username FROM users " +
                                    "WHERE district = ? AND role = 'DISTRICT_ADMIN' " +
                                    "ORDER BY created_at ASC LIMIT 1";
                    List<Map<String, Object>> admins =
                            jdbcTemplate.queryForList(findAdminSql, district);

                    if (!admins.isEmpty()) {
                        username = (String) admins.get(0).get("username");
                        logger.info("Support message routed to district admin: {} (district: {})",
                                username, district);
                    } else {

                        username = "system_admin";
                        logger.warn("No DISTRICT_ADMIN found for: {} — falling back to system_admin", district);
                    }
                } catch (Exception e) {
                    logger.warn("District admin lookup failed: {} — falling back to system_admin",
                            e.getMessage());
                    username = "system_admin";
                }
            }

            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Username is required"));
            }

            String sql =
                    "INSERT INTO notifications (username, message, type, sender, sender_name, sender_role, is_read, timestamp) " +
                            "VALUES (?, ?, ?, ?, ?, ?, false, NOW())";
            jdbcTemplate.update(sql, username, message, type, sender, senderName, senderRole);

            return ResponseEntity.ok(Map.of("success", true, "message", "Notification created"));

        } catch (Exception e) {
            logger.error("❌ Error creating notification: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/notifications/admin/chat")
    public ResponseEntity<?> getAdminChatNotifications(@RequestParam String username, @RequestParam(required = false) String message) {
        try {
            String adminUsername = "admin";

            String notificationMessage = "New chat message from " + username + ": " + (message != null ? message : "New message");

            String sql = "INSERT INTO notifications (username, message, type, sender, sender_name, sender_role, is_read, timestamp) " +
                    "VALUES (?, ?, 'CHAT', ?, ?, 'Citizen', false, NOW())";

            jdbcTemplate.update(sql, adminUsername, notificationMessage, username, username);

            String getSql = "SELECT * FROM notifications WHERE username = ? ORDER BY timestamp DESC LIMIT 20";
            List<Map<String, Object>> notifications = jdbcTemplate.queryForList(getSql, username);

            return ResponseEntity.ok(Map.of("success", true, "notifications", notifications));

        } catch (Exception e) {
            logger.error("❌ Error getting admin chat notifications: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }
}
