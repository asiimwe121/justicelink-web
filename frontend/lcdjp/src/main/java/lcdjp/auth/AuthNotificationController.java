package lcdjp.auth;

import lcdjp.notification.NotificationCreateRequest;
import lcdjp.security.RoleAuthority;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
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
    private AuthNotificationRepository authNotifications;

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(Authentication authentication) {

        // Notifications are a background convenience, never an error: no session -> empty list.
        String username = authenticatedName(authentication);
        if (username == null) {
            return ResponseEntity.ok(Map.of("success", true, "notifications", List.of()));
        }

        try {
            List<Map<String, Object>> notifications = authNotifications.findLatest(username, 50);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "notifications", notifications
            ));

        } catch (Exception e) {
            logger.warn("Notifications fetch failed, returning empty list: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("success", true, "notifications", List.of()));
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
                role = authNotifications.findRole(actor);
            } catch (Exception e) {
                logger.warn("role lookup failed for {}; treating as a normal user: {}", actor, e.toString());
            }

            int updated;
            if (RoleAuthority.isSharedAdminInboxRole(role)) {
                updated = authNotifications.markReadInAdminInbox(id);
            } else {

                updated = authNotifications.markReadForUser(id, actor);
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
                Map<String, Object> row = authNotifications.findOwnerAndReadFlag(id);
                if (row != null) {
                    ownerUsername = (String) row.get("username");
                    Object isReadVal = row.get("is_read");
                    alreadyRead = (isReadVal instanceof Boolean) ? (Boolean) isReadVal
                            : (isReadVal != null && isReadVal.toString().equals("1"));
                }
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
            actorRole = authNotifications.findRole(actor);
        } catch (Exception e) {
            logger.warn("role lookup failed for {}; treating as a normal user: {}", actor, e.toString());
        }
        if (!actor.equals(username) && !RoleAuthority.isSystemAdminRole(actorRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You may only mark your own notifications as read"));
        }

        try {
            int updated = authNotifications.markAllRead(username);
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
        // Never an error for the user: logged out, unverified or a hiccup all read as "0 unread".
        if (authenticatedName(authentication) == null) {
            return ResponseEntity.ok(Map.of("unreadCount", 0));
        }
        try {
            String effectiveUsername = resolveNotificationUsername(username, authentication);
            int count = authNotifications.countUnread(effectiveUsername);
            return ResponseEntity.ok(Map.of("unreadCount", count));
        } catch (Exception e) {
            logger.warn("Unread notifications lookup failed, returning 0: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("unreadCount", 0));
        }
    }

    @GetMapping("/notifications/user/{username}")
    public ResponseEntity<?> getUserNotifications(@PathVariable String username,
                                                  Authentication authentication) {
        if (authenticatedName(authentication) == null) {
            return ResponseEntity.ok(Map.of("success", true, "notifications", List.of()));
        }
        try {
            String effectiveUsername = resolveNotificationUsername(username, authentication);
            List<Map<String, Object>> notifications = authNotifications.findLatest(effectiveUsername, 50);
            return ResponseEntity.ok(Map.of("success", true, "notifications", notifications));
        } catch (Exception e) {
            logger.warn("User notifications lookup failed, returning empty list: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("success", true, "notifications", List.of()));
        }
    }

    /** Username of a real logged-in user, or null for no/anonymous authentication. */
    private static String authenticatedName(Authentication authentication) {
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()) {
            return null;
        }
        String name = authentication.getName();
        return (name == null || name.isBlank()) ? null : name;
    }

    private String resolveNotificationUsername(String pathUsername, Authentication authentication) {
        String actor = authenticatedName(authentication);
        if (actor == null) {
            return pathUsername;
        }
        String role = null;
        try {
            role = authNotifications.findRole(actor);
        } catch (Exception e) {
            logger.warn("role lookup failed for {}; treating as a normal user: {}", actor, e.toString());
        }
        // Admins read the shared admin inbox; everyone else only ever reads their own notifications.
        return RoleAuthority.isSharedAdminInboxRole(role) ? "admin" : actor;
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
                    String districtAdmin = authNotifications.findDistrictAdminForSupport(district);

                    if (districtAdmin != null) {
                        username = districtAdmin;
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

            authNotifications.insertNotification(username, message, type, sender, senderName, senderRole);

            return ResponseEntity.ok(Map.of("success", true, "message", "Notification created"));

        } catch (Exception e) {
            logger.error("❌ Error creating notification: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    /** Creates the admin-inbox notification for a chat message. State-changing, so POST; the sender is the session user. */
    @PostMapping("/notifications/admin/chat")
    public ResponseEntity<?> postAdminChatNotification(@RequestBody(required = false) Map<String, String> body,
                                                       Authentication authentication) {
        String username = authenticatedName(authentication);
        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        try {
            String message = body == null ? null : body.get("message");
            if (message != null && message.length() > 200) {
                message = message.substring(0, 200);
            }
            String notificationMessage = "New chat message from " + username + ": "
                    + (message != null && !message.isBlank() ? message : "New message");

            authNotifications.insertAdminChatNotification("admin", notificationMessage, username);

            List<Map<String, Object>> notifications = authNotifications.findLatest(username, 20);
            return ResponseEntity.ok(Map.of("success", true, "notifications", notifications));
        } catch (Exception e) {
            logger.error("Error creating admin chat notification", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }
}
