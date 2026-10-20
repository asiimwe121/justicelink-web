package lcdjp.auth;

import lcdjp.admin.AuditLogService;
import lcdjp.security.LoginLockoutService;
import lcdjp.common.RateLimiterService;
import lcdjp.security.RequestIdentity;
import lcdjp.security.RoleAuthority;
import lcdjp.user.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetLinkController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(PasswordResetLinkController.class);

    private static final int MAX_PASSWORD_BYTES = 72;

    @Autowired
    private UserAccountRepository userAccounts;
    @Autowired
    private RequestIdentity requestIdentity;
    @Autowired
    private PasswordResetLinkService passwordResetLinkService;
    @Autowired
    private LoginLockoutService loginLockoutService;
    @Autowired
    private RateLimiterService rateLimiterService;

    @org.springframework.beans.factory.annotation.Value("${app.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    @org.springframework.beans.factory.annotation.Value("${app.trusted-proxy-hops:0}")
    private int trustedProxyHops;

    /** Real client address (not the proxy's), same rule as the rate-limit filter and audit log. */
    private String clientIp(HttpServletRequest request) {
        return lcdjp.common.ClientIp.resolve(request, trustProxyHeaders, trustedProxyHops);
    }
    @Autowired
    private AuditLogService auditLogService;
    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    private static final class Authorized {
        final String adminUsername;
        final String adminRole;
        final Map<String, Object> target;
        final ResponseEntity<?> denied;

        Authorized(String adminUsername, String adminRole, Map<String, Object> target, ResponseEntity<?> denied) {
            this.adminUsername = adminUsername;
            this.adminRole = adminRole;
            this.target = target;
            this.denied = denied;
        }

        static Authorized deny(HttpStatus status, String message) {
            return new Authorized(null, null, null, ResponseEntity.status(status).body(Map.of("error", message)));
        }
    }

    private Authorized authorizeAdminFor(String targetUsername, HttpServletRequest request) {
        String adminUsername = requestIdentity.resolveUsername(request);
        if (adminUsername == null) {
            return Authorized.deny(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        String adminRole = requestIdentity.resolveRole(request, adminUsername);
        boolean systemAdmin = RoleAuthority.isSystemAdminRole(adminRole);
        boolean districtAdmin = RoleAuthority.isDistrictAdminRole(adminRole);
        if (!systemAdmin && !districtAdmin) {
            return Authorized.deny(HttpStatus.FORBIDDEN,
                    "Only System Admins and District Admins can do this");
        }

        Map<String, Object> target = userAccounts.findResetTarget(targetUsername);
        if (target == null) {
            return Authorized.deny(HttpStatus.NOT_FOUND, "User not found");
        }

        if (!systemAdmin) {
            String targetRole = target.get("role") == null ? null : target.get("role").toString();
            if (RoleAuthority.isSystemAdminRole(targetRole) || RoleAuthority.isDistrictAdminRole(targetRole)) {
                return Authorized.deny(HttpStatus.FORBIDDEN,
                        "District Admins cannot manage administrator accounts. Please ask a System Admin.");
            }
            String adminDistrict = requestIdentity.resolveDistrict(request, adminUsername);
            String targetDistrict = target.get("district") == null ? null : target.get("district").toString();
            if (adminDistrict == null || adminDistrict.isBlank() || targetDistrict == null
                    || !adminDistrict.trim().equalsIgnoreCase(targetDistrict.trim())) {
                return Authorized.deny(HttpStatus.FORBIDDEN,
                        "District Admins can only manage users in their assigned district.");
            }
        }
        return new Authorized(adminUsername, adminRole, target, null);
    }

    @PostMapping("/users/{username}/send-reset-link")
    public ResponseEntity<?> sendResetLink(@PathVariable String username, HttpServletRequest request) {
        try {
            Authorized auth = authorizeAdminFor(username, request);
            if (auth.denied != null) return auth.denied;

            if (!rateLimiterService.isAllowed("admin-reset-link:" + username.toLowerCase(java.util.Locale.ROOT), 3, 10)
                    || !rateLimiterService.isAllowed("admin-reset-link-by:" + auth.adminUsername.toLowerCase(java.util.Locale.ROOT), 30, 10)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "error", "A reset link was just sent. Please wait a few minutes before sending another."));
            }

            String email = auth.target.get("email") == null ? "" : auth.target.get("email").toString().trim();
            String phone = auth.target.get("phone") == null ? "" : auth.target.get("phone").toString().trim();
            if (email.isEmpty() && phone.isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "This user has no email address or phone number on file to send the link to."));
            }

            PasswordResetLinkService.DeliveryResult result =
                    passwordResetLinkService.issueAndSend(auth.target, auth.adminUsername);

            if (!result.anySent()) {
                auditLogService.logActionWithRequest(auth.adminUsername, auth.adminRole,
                        "PASSWORD_RESET_LINK_FAILED", "user", username,
                        "Reset link could not be delivered by email or SMS", request);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                        "error", "The reset link could not be delivered. Please try again shortly."));
            }

            auditLogService.logActionWithRequest(auth.adminUsername, auth.adminRole,
                    "PASSWORD_RESET_LINK_SENT", "user", username,
                    "Reset link sent via " + String.join(" and ", result.channels()), request);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("channels", result.channels());
            body.put("emailSent", result.emailSent);
            body.put("smsSent", result.smsSent);
            body.put("emailFailed", result.emailAttempted && !result.emailSent);
            body.put("smsFailed", result.smsAttempted && !result.smsSent);
            body.put("expiresInMinutes", passwordResetLinkService.getLinkTtlMinutes());
            if (result.emailSent) body.put("maskedEmail", maskEmail(email));
            if (result.smsSent) body.put("maskedPhone", maskPhone(phone));
            body.put("message", describeDelivery(result));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            logger.error("Sending reset link failed for '{}'", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Could not send the reset link. Please try again later."));
        }
    }

    @GetMapping("/users/{username}/login-lock")
    public ResponseEntity<?> loginLockStatus(@PathVariable String username, HttpServletRequest request) {
        try {
            Authorized auth = authorizeAdminFor(username, request);
            if (auth.denied != null) return auth.denied;

            LocalDateTime until = loginLockoutService.lockedUntil(username);
            Map<String, Object> body = new HashMap<>();
            body.put("locked", until != null);
            if (until != null) {
                body.put("lockedUntil", until.toString());
                body.put("lockedUntilEpochMs", until.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli());
            }
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            logger.error("Reading login lock for '{}' failed", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Could not check the account's login status."));
        }
    }

    @PostMapping("/users/{username}/unlock-login")
    public ResponseEntity<?> unlockLogin(@PathVariable String username, HttpServletRequest request) {
        try {
            Authorized auth = authorizeAdminFor(username, request);
            if (auth.denied != null) return auth.denied;

            boolean hadBlock = loginLockoutService.unlock(username);
            auditLogService.logActionWithRequest(auth.adminUsername, auth.adminRole,
                    "LOGIN_UNLOCKED", "user", username,
                    hadBlock ? "Login block lifted by administrator" : "Unlock requested; account had no active block",
                    request);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "@" + username + " can log in again."));
        } catch (Exception e) {
            logger.error("Unlocking login for '{}' failed", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Could not unlock the account. Please try again."));
        }
    }

    @PostMapping("/reset-link/validate")
    public ResponseEntity<?> validateResetLink(@Valid @RequestBody ResetLinkValidateRequest body,
                                               HttpServletRequest request) {
        if (!rateLimiterService.isAllowed("reset-link-validate:" + clientIp(request), 30, 5)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many attempts. Please try again later."));
        }
        try {
            boolean valid = passwordResetLinkService.findValidUsername(body.getToken()) != null;
            return ResponseEntity.ok(Map.of("valid", valid));
        } catch (Exception e) {
            logger.error("Validating reset link failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not check this link. Please try again later."));
        }
    }

    @PostMapping("/reset-link/confirm")
    public ResponseEntity<?> confirmResetLink(@Valid @RequestBody ResetLinkConfirmRequest body,
                                              HttpServletRequest request) {
        if (!rateLimiterService.isAllowed("reset-link-confirm:" + clientIp(request), 10, 15)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many attempts. Please try again later."));
        }
        try {
            String newPassword = body.getNewPassword();
            if (!newPassword.equals(body.getConfirmPassword())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match"));
            }
            if (newPassword.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is too long"));
            }

            String username = passwordResetLinkService.completeReset(
                    body.getToken(), passwordEncoder.encode(newPassword));
            if (username == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "This reset link is invalid, has expired, or was already used. "
                                + "Please ask your administrator or support to send a new one."));
            }

            auditLogService.logActionWithRequest(username, "User", "PASSWORD_RESET_COMPLETED", "user", username,
                    "Password reset completed using an administrator-issued link", request);
            logger.info("✅ Password reset via admin link completed for: {}", username);

            return ResponseEntity.ok(Map.of("success", true, "message", "Your password has been reset. You can now log in."));
        } catch (Exception e) {
            logger.error("Completing reset link failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not reset the password. Please try again later."));
        }
    }

    private static String describeDelivery(PasswordResetLinkService.DeliveryResult r) {
        if (r.emailSent && r.smsSent) return "Reset link sent to the user's email and phone.";
        if (r.emailSent) {
            return r.smsAttempted
                    ? "Reset link sent to the user's email. The SMS could not be sent."
                    : "Reset link sent to the user's email (no phone number on file).";
        }
        return r.emailAttempted
                ? "Reset link sent by SMS. The email could not be sent."
                : "Reset link sent by SMS (no email address on file).";
    }

    static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }

    static String maskPhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() < 4) return "***";
        return "***" + digits.substring(digits.length() - 4);
    }
}
