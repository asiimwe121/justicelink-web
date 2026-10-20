package lcdjp.lcinvite;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lcdjp.common.ClientIp;
import lcdjp.common.RateLimiterService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

/**
 * The public side of LC sign-up by link: ask for a link, check a link, finish signing up.
 * None of these need a login. The admin side is in {@link LcInviteAdminController}.
 */
@RestController
@RequestMapping("/api/auth/lc-invite")
public class LcInviteController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LcInviteController.class);

    /** Same answer every time, whether or not the email is known, so the form can't be used to probe accounts. */
    private static final String REQUEST_RECEIVED_MESSAGE =
            "Your request was received. If the administrator approves it, a sign-up link will be sent to this email.";

    private final LcInviteService service;
    private final RateLimiterService rateLimiter;
    private final boolean trustProxyHeaders;
    private final int trustedProxyHops;

    public LcInviteController(LcInviteService service,
                              RateLimiterService rateLimiter,
                              @Value("${app.trust-proxy-headers:false}") boolean trustProxyHeaders,
                              @Value("${app.trusted-proxy-hops:0}") int trustedProxyHops) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.trustProxyHeaders = trustProxyHeaders;
        this.trustedProxyHops = trustedProxyHops;
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestLink(@Valid @RequestBody LcInviteRequest body, HttpServletRequest request) {
        String email = body.getEmail().trim().toLowerCase(Locale.ROOT);
        // Two limits: per address (stops one person filling an admin's list) and per email (stops mail-bombing one inbox).
        if (!rateLimiter.isAllowed("lc-invite-request-ip:" + clientIp(request), 5, 15)
                || !rateLimiter.isAllowed("lc-invite-request-email:" + email, 3, 60)) {
            return tooManyAttempts();
        }
        try {
            service.recordRequest(email, body.getDistrict());
            return ResponseEntity.ok(Map.of("success", true, "message", REQUEST_RECEIVED_MESSAGE));
        } catch (Exception e) {
            logger.error("Saving LC link request failed", e);
            return serverError("Could not save your request. Please try again later.");
        }
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateLink(@Valid @RequestBody LcInviteTokenRequest body, HttpServletRequest request) {
        if (!rateLimiter.isAllowed("lc-invite-validate:" + clientIp(request), 30, 5)) {
            return tooManyAttempts();
        }
        try {
            Map<String, String> info = service.describeLink(body.getToken());
            if (info == null) {
                return ResponseEntity.ok(Map.of("valid", false));
            }
            return ResponseEntity.ok(Map.of("valid", true, "email", info.get("email"), "district", info.get("district")));
        } catch (Exception e) {
            logger.error("Checking LC sign-up link failed", e);
            return serverError("Could not check this link. Please try again later.");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody LcInviteRegisterRequest body, HttpServletRequest request) {
        if (!rateLimiter.isAllowed("lc-invite-register:" + clientIp(request), 10, 15)) {
            return tooManyAttempts();
        }
        try {
            String username = service.completeSignup(body);
            return ResponseEntity.ok(Map.of("success", true, "username", username,
                    "message", "Your account is ready. You can now log in."));
        } catch (LcInviteException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Creating LC account from invite link failed", e);
            return serverError("Could not create the account. Please try again later.");
        }
    }

    private String clientIp(HttpServletRequest request) {
        return ClientIp.resolve(request, trustProxyHeaders, trustedProxyHops);
    }

    private static ResponseEntity<?> tooManyAttempts() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Too many attempts. Please try again later."));
    }

    private static ResponseEntity<?> serverError(String message) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", message));
    }
}
