package lcdjp.auth;

import lcdjp.admin.AdminOnlineRequest;
import lcdjp.admin.AuditLogService;
import lcdjp.notification.EmailService;
import lcdjp.notification.TestEmailRequest;
import lcdjp.security.RoleAuthority;
import lcdjp.security.SessionIdentity;
import lcdjp.user.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Operations and diagnostics under /api/auth (split out of AuthController, URLs unchanged): audit-log search,
 * health probe, test email, and the admin "online" status shown in the support chat.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthAdminOpsController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AuthAdminOpsController.class);

    private static final java.util.concurrent.ConcurrentHashMap<String, Boolean> ADMIN_ONLINE_STATUS =
            new java.util.concurrent.ConcurrentHashMap<>();

    @Autowired
    private EmailService emailService;
    @Autowired
    private AuthRepository authRepository;
    @Autowired
    private AuditLogService auditLogService;

    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs(@RequestParam(required = false) String username,
                                          @RequestParam(required = false) String action,
                                          HttpServletRequest request) {
        String loggedInUser = authenticatedRequestUsername(request);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String role = authenticatedRequestRole(request, loggedInUser);
        if (!isSystemAdminRole(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only administrators can view audit logs"));
        }

        try {
            List<Map<String, Object>> logs = authRepository.findAuditLogs(username, action);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));

        } catch (Exception e) {
            logger.error("❌ Audit logs fetch error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch audit logs. Please try again later."));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        try {
            authRepository.pingDatabase();
            return ResponseEntity.ok(Map.of(
                    "status", "OK",
                    "message", "LCDJP Backend is running with database connection",
                    "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            logger.error("❌ Health check database probe failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "ERROR",
                            "message", "Database connection failed."
                    ));
        }
    }

    @PostMapping("/test-email")
    public ResponseEntity<?> testEmail(@Valid @RequestBody TestEmailRequest request,
                                       HttpServletRequest httpRequest) {
        try {
            String caller = authenticatedRequestUsername(httpRequest);
            String callerRole = caller == null ? null : authenticatedRequestRole(httpRequest, caller);
            if (caller == null || !isSystemAdminRole(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only a System Administrator may use this diagnostic endpoint"));
            }
            String to = request.getEmail();
            String subject = "Test Email from JusticeLink";
            String body = "<h1>Test Email</h1><p>If you received this, Brevo is working!</p>";

            emailService.sendEmail(to, subject, body);

            return ResponseEntity.ok(Map.of("success", true, "message", "Email sent to " + to));
        } catch (Exception e) {
            logger.error("Test email send failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send test email."));
        }
    }

    @GetMapping("/test-endpoints")
    public ResponseEntity<?> testEndpoints() {
        return ResponseEntity.ok(Map.of(
                "message", "AuthController is working",
                "send-otp", "POST /api/auth/send-otp should exist"
        ));
    }

    @GetMapping("/admin/status")
    public ResponseEntity<?> getAdminStatus() {

        try {
            boolean isOnline = ADMIN_ONLINE_STATUS.values().stream().anyMatch(Boolean::booleanValue);
            String onlineAdmin = ADMIN_ONLINE_STATUS.entrySet().stream()
                    .filter(Map.Entry::getValue)
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse(null);

            Map<String, Object> response = new HashMap<>();
            response.put("online", isOnline);
            response.put("available", isOnline);
            response.put("message", isOnline ? "Admin is online" : "Admin is offline");
            if (onlineAdmin != null) {
                response.put("adminName", onlineAdmin);
            }
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PutMapping("/admin/status")
    public ResponseEntity<?> setAdminOnline(@Valid @RequestBody AdminOnlineRequest request,
                                            Authentication authentication) {
        try {

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            String username = authentication.getName();
            User principal = (User) authentication.getPrincipal();
            String role = principal.getRole();

            if (!isSystemAdminRole(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only admins can set status"));
            }

            Boolean online = request.requestedOnline();

            logger.info("👤 Admin " + username + " status set to: " + (online ? "ONLINE" : "OFFLINE"));

            ADMIN_ONLINE_STATUS.put(username, online);

            auditLogService.logAction(
                    username,
                    role,
                    "ADMIN_STATUS_CHANGED",
                    "admin",
                    username,
                    "Admin status set to: " + (online ? "ONLINE" : "OFFLINE")
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "online", online,
                    "message", "Status updated successfully"
            ));

        } catch (Exception e) {
            logger.error("❌ Error setting admin status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    private boolean isSystemAdminRole(String role) {
        return RoleAuthority.isSystemAdminRole(role);
    }

    private String authenticatedRequestUsername(HttpServletRequest request) {
        return SessionIdentity.username(request);
    }

    private String authenticatedRequestRole(HttpServletRequest request, String username) {
        return SessionIdentity.role(request, username, authRepository::findRole);
    }
}
