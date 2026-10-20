package lcdjp.lcinvite;

import jakarta.servlet.http.HttpServletRequest;
import lcdjp.admin.AuditLogService;
import lcdjp.common.RateLimiterService;
import lcdjp.security.RequestIdentity;
import lcdjp.security.RoleAuthority;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * The admin side of LC sign-up by link: see who asked, send a link or decline.
 * SecurityConfig already limits /api/lc/** to System Admins and District Admins;
 * which district each admin may touch is checked in {@link LcInviteService}.
 */
@RestController
@RequestMapping("/api/lc/invites")
public class LcInviteAdminController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LcInviteAdminController.class);

    private final LcInviteService service;
    private final RequestIdentity requestIdentity;
    private final RateLimiterService rateLimiter;
    private final AuditLogService auditLogService;

    public LcInviteAdminController(LcInviteService service,
                                   RequestIdentity requestIdentity,
                                   RateLimiterService rateLimiter,
                                   AuditLogService auditLogService) {
        this.service = service;
        this.requestIdentity = requestIdentity;
        this.rateLimiter = rateLimiter;
        this.auditLogService = auditLogService;
    }

    /** Who is calling, taken from the login, never from the request body. */
    private record Admin(String username, String role, String district) {
    }

    private Admin currentAdmin(HttpServletRequest request) {
        String username = requestIdentity.resolveUsername(request);
        if (username == null) return null;
        String role = requestIdentity.resolveRole(request, username);
        if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) return null;
        return new Admin(username, role, requestIdentity.resolveDistrict(request, username));
    }

    @GetMapping
    public ResponseEntity<?> listRequests(HttpServletRequest request) {
        Admin admin = currentAdmin(request);
        if (admin == null) return notAllowed();
        try {
            List<Map<String, Object>> requests = service.listOpenRequests(admin.role(), admin.district());
            return ResponseEntity.ok(Map.of("requests", requests));
        } catch (Exception e) {
            logger.error("Listing LC link requests failed", e);
            return serverError("Could not load the requests. Please try again later.");
        }
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<?> sendLink(@PathVariable long id, HttpServletRequest request) {
        Admin admin = currentAdmin(request);
        if (admin == null) return notAllowed();
        // Stops an accidental double-click from emailing the same person twice.
        if (!rateLimiter.isAllowed("lc-invite-send:" + id, 3, 10)
                || !rateLimiter.isAllowed("lc-invite-send-by:" + admin.username().toLowerCase(), 30, 10)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "A link was just sent. Please wait a few minutes before sending another."));
        }
        try {
            LocalDateTime expiresAt = service.sendLink(id, admin.username(), admin.role(), admin.district());
            auditLogService.logActionWithRequest(admin.username(), admin.role(), "LC_INVITE_LINK_SENT",
                    "lc_invite", String.valueOf(id), "Sent an LC sign-up link", request);
            return ResponseEntity.ok(Map.of("success", true,
                    "message", "Sign-up link sent.", "expiresAt", expiresAt.toString()));
        } catch (LcInviteException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Sending LC sign-up link failed", e);
            return serverError("Could not send the link. Please try again later.");
        }
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<?> decline(@PathVariable long id, HttpServletRequest request) {
        Admin admin = currentAdmin(request);
        if (admin == null) return notAllowed();
        try {
            service.decline(id, admin.username(), admin.role(), admin.district());
            auditLogService.logActionWithRequest(admin.username(), admin.role(), "LC_INVITE_DECLINED",
                    "lc_invite", String.valueOf(id), "Declined an LC link request", request);
            return ResponseEntity.ok(Map.of("success", true, "message", "Request declined."));
        } catch (LcInviteException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Declining LC link request failed", e);
            return serverError("Could not decline the request. Please try again later.");
        }
    }

    private static ResponseEntity<?> notAllowed() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Only System Admins and District Admins can manage LC link requests."));
    }

    private static ResponseEntity<?> serverError(String message) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", message));
    }
}
