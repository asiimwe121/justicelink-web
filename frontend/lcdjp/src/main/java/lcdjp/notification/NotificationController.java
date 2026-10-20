package lcdjp.notification;

import lcdjp.common.ApiErrors;
import lcdjp.security.RoleAuthority;
import lcdjp.user.UserAccountRepository;
import lcdjp.user.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRoleRepository userRoles;
    private final UserAccountRepository userAccounts;
    private final NotificationLookupRepository notificationLookup;

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserNotifications(@PathVariable String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;
        try {
            List<Notification> notifications = notificationService.getNotificationsByUser(username);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "notifications", notifications,
                    "count", notifications.size()
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @GetMapping("/user/{username}/unread")
    public ResponseEntity<?> getUnreadNotifications(@PathVariable String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;
        try {
            List<Notification> notifications = notificationService.getUnreadNotifications(username);
            Long unreadCount = notificationService.getUnreadCount(username);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "notifications", notifications,
                    "unreadCount", unreadCount
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @GetMapping("/user/{username}/count")
    public ResponseEntity<?> getUnreadCount(@PathVariable String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;
        try {
            Long count = notificationService.getUnreadCount(username);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "unreadCount", count
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();
            String owner = notificationOwner(notificationId);
            if (owner == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Notification not found"));
            }
            if (!actor.equals(owner) && !isAdministrator(actor)) {
                return forbidden("You may only update your own notifications");
            }
            Notification notification = notificationService.markAsRead(notificationId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification marked as read",
                    "notification", notification
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @PutMapping("/user/{username}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;
        try {
            notificationService.markAllAsRead(username);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "All notifications marked as read"
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long notificationId) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();
            String owner = notificationOwner(notificationId);
            if (owner == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Notification not found"));
            }
            if (!actor.equals(owner) && !isAdministrator(actor)) {
                return forbidden("You may only delete your own notifications");
            }
            notificationService.deleteNotification(notificationId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification deleted"
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @DeleteMapping("/user/{username}")
    public ResponseEntity<?> deleteAllNotifications(@PathVariable String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;
        try {
            notificationService.deleteAllByUser(username);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "All notifications cleared"
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendNotification(@Valid @RequestBody SendNotificationRequest request) {
        try {
            String actor = authenticatedUsername();
            if (actor == null) return unauthorized();

            String username = request.getUsername();
            String message = request.getMessage();
            String type = request.getType();

            String sender = actor;
            String senderName = resolveDisplayName(actor);
            String senderRole = userRole(actor);

            if (!actor.equals(username) && !isAdministrator(actor)) {
                return forbidden("You may only send notifications as yourself");
            }

            Notification notification = notificationService.createNotification(
                    username, message, type, sender, senderName, senderRole
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification sent",
                    "notification", notification
            ));
        } catch (Exception e) {
            return ApiErrors.serverError(NotificationController.class, e);
        }
    }

    private String resolveDisplayName(String username) {
        try {
            return userAccounts.findDisplayName(username);
        } catch (Exception e) {
            return username;
        }
    }

    private String notificationOwner(Long notificationId) {
        try {
            return notificationLookup.findOwner(notificationId);
        } catch (Exception e) {
            return null;
        }
    }

    private String userRole(String username) {
        try {
            return userRoles.findRole(username);
        } catch (Exception e) {
            return null;
        }
    }

    private String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (authentication != null && authentication.isAuthenticated())
                ? authentication.getName() : null;
    }

    private boolean isAdministrator(String username) {
        return RoleAuthority.isAdministratorRole(userRole(username));
    }

    private ResponseEntity<?> requireActor(String targetUsername) {
        String actor = authenticatedUsername();
        if (actor == null) return unauthorized();
        if (!actor.equals(targetUsername) && !isAdministrator(actor)) {
            return forbidden("You may only access your own notifications");
        }
        return null;
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
    }

    private ResponseEntity<?> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", message));
    }
}