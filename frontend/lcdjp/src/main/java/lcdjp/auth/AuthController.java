package lcdjp.auth;

import lcdjp.admin.AdminOnlineRequest;
import lcdjp.admin.AuditLogService;
import lcdjp.security.AuthCookies;
import lcdjp.notification.EmailService;
import lcdjp.security.JwtUtil;
import lcdjp.security.LoginLockoutService;
import lcdjp.notification.NotificationDispatcher;
import lcdjp.common.RateLimited;
import lcdjp.common.RateLimiterService;
import lcdjp.security.RecaptchaService;
import lcdjp.security.RoleAuthority;
import lcdjp.security.SessionIdentity;
import lcdjp.security.SessionRevocationService;
import lcdjp.notification.SmsService;
import lcdjp.notification.TestEmailRequest;
import lcdjp.security.TokenBlacklistService;
import lcdjp.user.User;
import lcdjp.user.UserService;
import lcdjp.verification.VerificationOtpRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.ArrayList;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private EmailService emailService;
    @Autowired
    private NotificationDispatcher notificationDispatcher;
    @Autowired
    private SmsService smsService;
    @Autowired
    private AuthRepository authRepository;

    @Autowired
    private AccountSecurityRepository accountSecurity;

    @Autowired
    private AuditLogService auditLogService;
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
    private RecaptchaService recaptchaService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginOtpService loginOtpService;

    @Autowired
    private LoginLockoutService loginLockoutService;

    @Autowired
    private SessionRevocationService sessionRevocationService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        if (loginRequest == null
                || loginRequest.getUsername() == null
                || loginRequest.getUsername().isBlank()
                || loginRequest.getPassword() == null
                || loginRequest.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required."));
        }

        String clientIp = clientIp(request);
        if (!rateLimiterService.isAllowed("login:" + clientIp, 10, 1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many login attempts. Please try again later."));
        }

        if (!recaptchaService.verify(loginRequest.getRecaptchaToken(), clientIp)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Please complete the reCAPTCHA verification."));
        }
        String username = loginRequest.getUsername();
        String password = loginRequest.getPassword();

        logger.info("🔐 Login attempt: " + username);

        try {
            LocalDateTime blockedUntil = loginLockoutService.lockedUntil(username);
            if (blockedUntil != null) {
                logger.info("🔒 Login refused, account temporarily blocked: " + username);
                auditLogService.logActionWithRequest(
                        username,
                        "Unknown",
                        "LOGIN_BLOCKED",
                        "user",
                        username,
                        "Login refused - account temporarily blocked after repeated failed attempts",
                        request
                );
                return lockedResponse(blockedUntil);
            }

            List<Map<String, Object>> results = authRepository.findUserByUsername(username);

            if (results.isEmpty()) {
                logger.info("❌ User not found: " + username);
                auditLogService.logActionWithRequest(
                        username,
                        "Unknown",
                        "LOGIN_FAILED",
                        "user",
                        username,
                        "Failed login - user not found",
                        request
                );
                return failedLoginResponse(loginLockoutService.recordFailure(username));
            }

            Map<String, Object> user = results.get(0);
            String dbPassword = (String) user.get("password_hash");
            String dbRole = (String) user.get("role");
            String approvalStatus = (String) user.get("approval_status");
            String dbDistrict = (String) user.get("district");
            if (dbDistrict == null) dbDistrict = "";

            if (approvalStatus == null) approvalStatus = "Pending";

            boolean passwordMatches = false;
            if (dbPassword != null && (dbPassword.startsWith("$2a$") || dbPassword.startsWith("$2b$") || dbPassword.startsWith("$2y$"))) {
                passwordMatches = password != null && passwordEncoder.matches(password, dbPassword);
            } else if (password != null && dbPassword != null && MessageDigest.isEqual(
                    password.getBytes(StandardCharsets.UTF_8),
                    dbPassword.getBytes(StandardCharsets.UTF_8))) {
                passwordMatches = true;
                accountSecurity.updatePasswordHash(username, passwordEncoder.encode(password));
            }

            if (!passwordMatches) {
                logger.info("❌ Incorrect password for: " + username);
                auditLogService.logActionWithRequest(
                        username,
                        dbRole,
                        "LOGIN_FAILED",
                        "user",
                        username,
                        "Failed login attempt - incorrect password",
                        request
                );
                LoginLockoutService.FailureResult failure = loginLockoutService.recordFailure(username);
                if (failure.locked) {
                    auditLogService.logActionWithRequest(
                            username,
                            dbRole,
                            "LOGIN_LOCKED",
                            "user",
                            username,
                            "Account blocked for " + LoginLockoutService.LOCK_DURATION.toHours()
                                    + " hours after " + LoginLockoutService.MAX_FAILED_ATTEMPTS
                                    + " failed login attempts",
                            request
                    );
                }
                return failedLoginResponse(failure);
            }

            loginLockoutService.recordSuccess(username);

            if ("Disabled".equals(approvalStatus)) {
                logger.info("🔒 Account disabled: " + username);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account has been disabled. Contact support."));
            }

            logger.info("🔑 Password verified for: " + username + " (" + dbRole + ") — awaiting OTP");

            String email = (String) user.get("email");
            String phone = (String) user.get("phone");
            try {
                Map<String, Object> otpResult = loginOtpService.sendOtp(
                        request, username, email, phone, loginRequest.isRememberMe());

                auditLogService.logActionWithRequest(
                        username,
                        dbRole,
                        "LOGIN_OTP_SENT",
                        "user",
                        username,
                        "Login code dispatched via " + otpResult.get("channel"),
                        request
                );

                Map<String, Object> responseBody = new HashMap<>();
                responseBody.put("success", true);
                responseBody.put("requireOtp", true);
                responseBody.put("username", username);
                responseBody.put("channel", otpResult.get("channel"));
                responseBody.put("message", otpResult.get("message"));
                return ResponseEntity.ok(responseBody);
            } catch (LoginOtpService.TooManyRequestsException e) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("error", "Please wait before requesting another code."));
            } catch (LoginOtpService.NoContactOnFileException e) {
                logger.error("⚠️ Login OTP could not be sent (no contact on file) for: " + username);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "No email or phone number is on file to verify this login. Please contact support."));
            } catch (Exception e) {
                logger.error("⚠️ Failed to send login OTP for '{}': {}", username, e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Could not send a login code. Please try again later."));
            }

        } catch (Exception e) {
            logger.error("Login failed due to an unexpected error for user '{}'", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed due to a server error. Please try again later."));
        }
    }

    private ResponseEntity<?> failedLoginResponse(LoginLockoutService.FailureResult failure) {
        if (failure != null && failure.locked) {
            return lockedResponse(failure.lockedUntil);
        }
        int remaining = failure == null ? 0 : failure.attemptsRemaining;
        Map<String, Object> body = new HashMap<>();
        body.put("error", "Invalid username or password. You have " + remaining
                + (remaining == 1 ? " attempt" : " attempts") + " left before your account is blocked for "
                + LoginLockoutService.LOCK_DURATION.toHours() + " hours.");
        body.put("attemptsRemaining", remaining);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    private ResponseEntity<?> lockedResponse(LocalDateTime lockedUntil) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "Too many failed login attempts. Your account has been blocked for "
                + LoginLockoutService.LOCK_DURATION.toHours()
                + " hours. Please contact support to have it unlocked.");
        body.put("locked", true);
        if (lockedUntil != null) {
            body.put("lockedUntil", lockedUntil.toString());
        }
        String supportEmail = loginLockoutService.getSupportEmail();
        if (supportEmail != null && !supportEmail.isBlank()) {
            body.put("supportEmail", supportEmail);
        }
        return ResponseEntity.status(HttpStatus.LOCKED).body(body);
    }

    @PostMapping("/login/verify-otp")
    public ResponseEntity<?> verifyLoginOtp(@Valid @RequestBody VerificationOtpRequest otpRequest,
                                            HttpServletRequest request) {
        String username = otpRequest.getUsername();
        String clientIp = clientIp(request);
        if (!rateLimiterService.isAllowed("login-otp:" + clientIp, 20, 5)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many attempts. Please try again later."));
        }

        LocalDateTime blockedUntil = loginLockoutService.lockedUntil(username);
        if (blockedUntil != null) {
            return lockedResponse(blockedUntil);
        }

        LoginOtpService.VerifyResult result = loginOtpService.verifyOtp(request, username, otpRequest.getOtp());
        if (!result.success) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", result.error));
        }

        try {
            List<Map<String, Object>> results = authRepository.findUserByUsername(username);
            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid username or password."));
            }

            Map<String, Object> user = results.get(0);
            String dbRole = (String) user.get("role");
            String dbDistrict = (String) user.get("district");
            if (dbDistrict == null) dbDistrict = "";
            String approvalStatus = (String) user.get("approval_status");
            if (approvalStatus == null) approvalStatus = "Pending";

            if ("Disabled".equals(approvalStatus)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account has been disabled. Contact support."));
            }

            Object pwChangedRaw = user.get("password_changed");
            boolean passwordChanged = pwChangedRaw instanceof Boolean
                    ? (Boolean) pwChangedRaw
                    : pwChangedRaw instanceof Number && ((Number) pwChangedRaw).intValue() != 0;
            if (dbRole != null && ("Admin".equals(dbRole) || "SYSTEM_ADMIN".equals(dbRole)
                    || "DISTRICT_ADMIN".equals(dbRole) || "LC".equals(dbRole))
                    && !passwordChanged) {
                String tempToken = jwtUtil.generatePasswordChangeToken(username, dbRole, dbDistrict);
                Map<String, Object> responseBody = new HashMap<>();
                responseBody.put("success", true);
                responseBody.put("requirePasswordChange", true);
                responseBody.put("username", username);
                responseBody.put("role", dbRole);
                responseBody.put("fullName", user.get("first_name") + " " + user.get("last_name"));
                responseBody.put("token", tempToken);
                responseBody.put("message", "Please change your password before continuing");
                return ResponseEntity.ok(responseBody);
            }

            String userType = (String) user.get("user_type");
            if (userType == null || userType.isEmpty()) {
                userType = "individual";
            }

            return finishLogin(user, username, dbRole, dbDistrict, approvalStatus, userType,
                    result.rememberMe, request);
        } catch (Exception e) {
            logger.error("Login OTP verification failed unexpectedly for user '{}'", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed due to a server error. Please try again later."));
        }
    }

    @PostMapping("/login/resend-otp")
    public ResponseEntity<?> resendLoginOtp(@Valid @RequestBody UsernameRequest usernameRequest,
                                            HttpServletRequest request) {
        String username = usernameRequest.getUsername();
        String clientIp = clientIp(request);
        if (!rateLimiterService.isAllowed("login-otp-resend:" + clientIp, 10, 5)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many attempts. Please try again later."));
        }

        if (!loginOtpService.hasPending(request, username)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No active login verification was found. Please log in again."));
        }

        try {
            List<Map<String, Object>> results = authRepository.findContactAndRole(username);
            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No active login verification was found. Please log in again."));
            }
            Map<String, Object> row = results.get(0);
            String email = (String) row.get("email");
            String phone = (String) row.get("phone");

            boolean rememberMe = false;
            HttpSession existingSession = request.getSession(false);
            if (existingSession != null) {
                Object rm = existingSession.getAttribute("lcdjp_login_otp_remember_me");
                rememberMe = Boolean.TRUE.equals(rm);
            }

            Map<String, Object> otpResult = loginOtpService.sendOtp(request, username, email, phone, rememberMe);
            auditLogService.logActionWithRequest(
                    username, (String) row.get("role"), "LOGIN_OTP_RESENT", "user", username,
                    "Login code re-sent via " + otpResult.get("channel"), request);
            return ResponseEntity.ok(otpResult);
        } catch (LoginOtpService.TooManyRequestsException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Please wait before requesting another code."));
        } catch (LoginOtpService.NoContactOnFileException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No email or phone number is on file to verify this login. Please contact support."));
        } catch (Exception e) {
            logger.error("⚠️ Failed to resend login OTP for '{}': {}", username, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not resend the code. Please try again later."));
        }
    }

    private ResponseEntity<?> finishLogin(Map<String, Object> user, String username, String dbRole,
                                          String dbDistrict, String approvalStatus, String userType,
                                          boolean rememberMe, HttpServletRequest request) {
        logger.info("✅ Login successful: " + username + " (" + dbRole + ")");

        auditLogService.logActionWithRequest(
                username,
                dbRole,
                "LOGIN",
                "user",
                username,
                "User logged in successfully",
                request
        );

        HttpSession session = request.getSession();
        session.setAttribute("username", username);
        session.setAttribute("role", dbRole);
        session.setAttribute("userType", userType);
        session.setAttribute("fullName", user.get("first_name") + " " + user.get("last_name"));
        session.setAttribute("phone", user.get("phone"));
        session.setAttribute("district", dbDistrict);
        session.setAttribute("village", user.get("village"));
        session.setAttribute("parish", user.get("parish"));
        session.setAttribute("subCounty", user.get("sub_county"));
        session.setMaxInactiveInterval(24 * 60 * 60);

        try {
            String email = (String) user.get("email");
            String firstName = (String) user.get("first_name");
            if (email != null && !email.isEmpty()) {
                String loginTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                String ipAddress = clientIp(request);
                String emailBody = "<h1>🔐 Login Alert</h1>"
                        + "<p>Hi " + firstName + ",</p>"
                        + "<p>Someone logged into your account at <strong>" + loginTime + "</strong>.</p>"
                        + "<p><strong>IP Address:</strong> " + ipAddress + "</p>"
                        + "<p><strong>Role:</strong> " + dbRole + "</p>"
                        + "<p>If this wasn't you, please contact support immediately.</p>"
                        + "<p>Best regards,<br>JusticeLink Team</p>";
                // Best-effort: sent off the request thread so a slow mail provider cannot delay or fail the login.
                notificationDispatcher.sendEmail(email, "🔐 Login Alert - JusticeLink", emailBody);
            }
        } catch (Exception e) {
            logger.error("⚠️ Failed to send login alert email: " + e.getMessage());
        }

        String jwtToken = jwtUtil.generateToken(username, dbRole, dbDistrict, rememberMe);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("username", username);
        responseBody.put("role", dbRole);
        responseBody.put("fullName", user.get("first_name") + " " + user.get("last_name"));
        responseBody.put("email", user.get("email") != null ? user.get("email") : "");
        responseBody.put("phone", user.get("phone") != null ? user.get("phone") : "");
        responseBody.put("district", dbDistrict);
        responseBody.put("village", user.get("village") != null ? user.get("village") : "");
        responseBody.put("parish", user.get("parish") != null ? user.get("parish") : "");
        responseBody.put("subCounty", user.get("sub_county") != null ? user.get("sub_county") : "");
        responseBody.put("approvalStatus", approvalStatus);
        responseBody.put("verificationStatus",
                user.get("verification_status") != null
                        ? user.get("verification_status") : "NOT_SUBMITTED");
        responseBody.put("userType", userType);
        responseBody.put("token", jwtToken);
        responseBody.put("message", "Login successful");

        logger.info("✅ JWT Token generated for: " + username);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE,
                        AuthCookies.issue(jwtToken, jwtUtil.extractExpirationSafely(jwtToken)))
                .body(responseBody);
    }

    @GetMapping("/recaptcha-config")
    public ResponseEntity<?> getRecaptchaConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("siteKey", recaptchaService.getSiteKey());
        config.put("configured", recaptchaService.isConfigured());
        return ResponseEntity.ok(config);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = authHeader.substring(7).trim();
            if (!token.isEmpty()) {
                tokenBlacklistService.blacklistToken(token, jwtUtil.extractExpirationSafely(token));
            }
        }

        HttpSession session = request.getSession(false);
        if (session != null) {
            String username = (String) session.getAttribute("username");
            // Do not session.invalidate(): that deletes the session from Redis while other requests from the same
            // browser are still running, and each of them then fails with "Session was invalidated" (HTTP 500)
            // when it tries to save the session on commit. Clearing the identity is enough; the session expires.
            for (String attr : new String[] {"username", "role", "userType", "fullName", "phone", "district",
                    "village", "parish", "subCounty", "isOrganization"}) {
                session.removeAttribute(attr);
            }

            auditLogService.logAction(
                    username != null ? username : "unknown",
                    "User",
                    "LOGOUT",
                    "user",
                    username != null ? username : "unknown",
                    "User logged out"
            );

            logger.info("🚪 User logged out: " + username);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.SET_COOKIE, AuthCookies.clear())
                    .body(Map.of("success", true, "message", "Logged out successfully"));
        }
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, AuthCookies.clear())
                .body(Map.of("success", true, "message", "Already logged out"));
    }

    @GetMapping("/auth-status")
    public ResponseEntity<?> checkAuthStatus(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("username") != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("authenticated", true);
            response.put("username", session.getAttribute("username"));
            response.put("role", session.getAttribute("role"));
            response.put("userType", session.getAttribute("userType"));
            response.put("fullName", session.getAttribute("fullName"));
            response.put("phone", session.getAttribute("phone"));
            response.put("district", session.getAttribute("district"));
            response.put("village", session.getAttribute("village"));
            response.put("parish", session.getAttribute("parish"));
            response.put("subCounty", session.getAttribute("subCounty"));
            response.put("isOrganization", session.getAttribute("isOrganization") != null ? session.getAttribute("isOrganization") : false);
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
    }

    @GetMapping("/jwt/validate")
    public ResponseEntity<?> validateJwt(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false, "error", "Missing or invalid Authorization header"));
        }

        try {
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);

            if (jwtUtil.isPasswordChangeToken(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("valid", false, "error", "You must change your password before continuing"));
            }

            if (username == null || !jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("valid", false, "error", "Invalid or expired token"));
            }

            User user = userService.findByUsername(username);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("valid", false, "error", "User not found"));
            }

            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "username", username,
                    "role", user.getRole(),
                    "fullName", ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                            + (user.getLastName() == null ? "" : user.getLastName())).trim(),
                    "district", user.getDistrict() == null ? "" : user.getDistrict(),
                    "approvalStatus", user.getApprovalStatus() == null ? "" : user.getApprovalStatus(),
                    "verificationStatus", user.getVerificationStatus() == null
                            ? "NOT_SUBMITTED" : user.getVerificationStatus()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false, "error", "Token validation failed"));
        }
    }

    @PostMapping("/refresh")
    @RateLimited(limit = 30, durationMinutes = 1)
    public ResponseEntity<?> refreshToken(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Missing or invalid Authorization header"));
        }

        try {
            String oldToken = authHeader.substring(7);

            if (tokenBlacklistService.isTokenBlacklisted(oldToken) || !jwtUtil.validateToken(oldToken)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired token"));
            }

            if (jwtUtil.isPasswordChangeToken(oldToken)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You must change your password before continuing"));
            }

            String username = jwtUtil.extractUsername(oldToken);

            if (sessionRevocationService.isRevoked(username, jwtUtil.extractIssuedAt(oldToken))) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Your session has ended. Please log in again."));
            }

            User user = userService.findByUsername(username);

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }

            if (Boolean.FALSE.equals(user.isActive()) || "Disabled".equals(user.getApprovalStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account has been disabled. Contact support."));
            }

            String district = user.getDistrict();
            if (district == null) district = "";
            String newToken = jwtUtil.generateToken(user.getUsername(), user.getRole(), district);
            auditLogService.logAction(
                    username,
                    user.getRole(),
                    "TOKEN_REFRESHED",
                    "user",
                    username,
                    "Token refreshed"
            );

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.SET_COOKIE,
                            AuthCookies.issue(newToken, jwtUtil.extractExpirationSafely(newToken)))
                    .body(Map.of(
                    "success", true,
                    "token", newToken,
                    "username", username
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Token refresh failed. Please try again later."));
        }
    }

    @PostMapping("/migrate-password")
    @RateLimited(limit = 8, durationMinutes = 15)
    public ResponseEntity<?> migratePassword(@Valid @RequestBody PasswordMigrationRequest request,
                                              HttpServletRequest httpRequest) {
        try {
            String username = request.getUsername();
            String plainPassword = request.getPassword();

            if (username == null || plainPassword == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Username and password required"));
            }

            String callerUsername = authenticatedRequestUsername(httpRequest);
            if (callerUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            String callerRole = authenticatedRequestRole(httpRequest, callerUsername);
            boolean isSelf = callerUsername.equals(username);
            boolean isAdmin = isSystemAdminRole(callerRole) || "Admin".equals(callerRole);
            if (!isSelf && !isAdmin) {
                logger.warn("Blocked attempt by '{}' to migrate password for '{}'", callerUsername, username);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only migrate your own password."));
            }

            List<Map<String, Object>> results = authRepository.findPasswordHash(username);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            String hashedPassword = passwordEncoder.encode(plainPassword);

            accountSecurity.updatePasswordHash(username, hashedPassword);

            auditLogService.logAction(
                    username,
                    "User",
                    "PASSWORD_MIGRATED",
                    "user",
                    username,
                    "Password migrated to bcrypt"
            );

            logger.info("✅ Password migrated for: " + username);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password migrated successfully"
            ));

        } catch (Exception e) {
            logger.error("Password migration failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to migrate password. Please try again later."));
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
