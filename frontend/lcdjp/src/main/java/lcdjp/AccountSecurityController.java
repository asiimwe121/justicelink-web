package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AccountSecurityController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(AccountSecurityController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private SmsService smsService;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginLockoutService loginLockoutService;

    @Autowired
    private SessionRevocationService sessionRevocationService;

    @PostMapping("/forgot-password")
    @RateLimited(limit = 5, durationMinutes = 15)
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        Map<String, Object> genericResponse = Map.of(
                "success", true,
                "message", "If an account matches that username and email, a reset code has been sent."
        );
        try {
            String username = request.getUsername();
            String email = request.getEmail();

            String sql = "SELECT username, email FROM users WHERE username = ? AND email = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username, email);

            if (results.isEmpty()) {
                return ResponseEntity.ok(genericResponse);
            }

            jdbcTemplate.update(
                    "UPDATE password_reset_tokens SET used = true WHERE username = ? AND used = false",
                    username
            );

            String resetCode = String.format("%06d", OtpConfig.OTP_RANDOM.nextInt(1_000_000));
            LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(10);

            jdbcTemplate.update(
                    "INSERT INTO password_reset_tokens (expiry_date, token, used, username) VALUES (?, ?, false, ?)",
                    expiryTime, resetCode, username
            );

            auditLogService.logAction(
                    username,
                    "User",
                    "PASSWORD_RESET_REQUESTED",
                    "user",
                    username,
                    "Password reset requested"
            );

            String resetBody = "<h1>JusticeLink Password Reset</h1>"
                    + "<p>Your password reset code is:</p>"
                    + "<p><strong style=\"font-size:22px;\">" + resetCode + "</strong></p>"
                    + "<p>This code expires in 10 minutes and can be used only once.</p>"
                    + "<p>If you did not request this, you can safely ignore this email.</p>";
            emailService.sendEmail(email, "JusticeLink Password Reset Code", resetBody);

            return ResponseEntity.ok(genericResponse);

        } catch (Exception e) {
            logger.error("Forgot password request failed", e);
            return ResponseEntity.ok(genericResponse);
        }
    }

    @PostMapping("/reset-password")
    @RateLimited(limit = 8, durationMinutes = 15)
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            String username = request.getUsername();

            String resetCode = request.getCode() != null ? request.getCode() : request.getResetToken();
            String newPassword = request.getNewPassword();
            String confirmPassword = request.getConfirmPassword();

            if (resetCode == null || resetCode.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Username and reset code are required"));
            }
            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Passwords do not match"));
            }

            String sql = "SELECT username FROM password_reset_tokens " +
                    "WHERE username = ? AND token = ? AND used = false AND expiry_date > NOW()";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username, resetCode);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid or expired reset code"));
            }

            String newPasswordHash = passwordEncoder.encode(newPassword);
            String updateSql = "UPDATE users SET password_hash = ? WHERE username = ?";
            jdbcTemplate.update(updateSql, newPasswordHash, username);
            jdbcTemplate.update(
                    "UPDATE password_reset_tokens SET used = true WHERE username = ? AND token = ?",
                    username, resetCode
            );
            loginLockoutService.unlock(username);
            sessionRevocationService.revokeAll(username);

            auditLogService.logAction(
                    username,
                    "User",
                    "PASSWORD_RESET_COMPLETED",
                    "user",
                    username,
                    "Password reset completed"
            );

            logger.info("✅ Password reset successful for: " + username);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password reset successful"
            ));

        } catch (Exception e) {
            logger.error("Reset password failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to reset password. Please try again later."));
        }
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody UsernameRequest request, HttpServletRequest httpRequest) {
        try {
            String username = request.getUsername();

            HttpSession session = httpRequest.getSession(false);
            Object pendingObject = session == null ? null : session.getAttribute("lcdjp_pending_registration");
            if (pendingObject instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> pending = (Map<String, Object>) pendingObject;
                String pendingUsername = String.valueOf(pending.get("username"));
                if (!pendingUsername.equals(username)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "Registration session does not match this username"));
                }

                String email = pending.get("email") == null ? "" : String.valueOf(pending.get("email"));
                if (email.trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "An email address is required to send the verification code"));
                }

                if (session.getAttribute("lcdjp_pending_otp_sent_at") instanceof Number
                        && System.currentTimeMillis()
                        - ((Number) session.getAttribute("lcdjp_pending_otp_sent_at")).longValue()
                        < OtpConfig.OTP_RESEND_COOLDOWN_MILLIS) {
                    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                            .body(Map.of("error", "Please wait before requesting another verification code"));
                }

                String otp = String.format("%06d", OtpConfig.OTP_RANDOM.nextInt(1_000_000));
                session.setAttribute("lcdjp_pending_otp", otp);
                session.setAttribute("lcdjp_pending_otp_expiry",
                        System.currentTimeMillis() + OtpConfig.OTP_LIFETIME_MILLIS);
                session.setAttribute("lcdjp_pending_otp_sent_at", System.currentTimeMillis());
                session.setAttribute("lcdjp_pending_otp_attempts", 0);

                String emailBody = "<h1>Your OTP Code</h1>"
                        + "<p>Your verification code is: <strong>" + otp + "</strong></p>"
                        + "<p>This code will expire in 5 minutes.</p>";
                emailService.sendEmail(email, "Your JusticeLink Verification Code", emailBody);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "OTP sent to your email"
                ));
            }

            String sql = "SELECT email FROM users WHERE username = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            String email = (String) results.get(0).get("email");

            String otp = String.format("%06d", OtpConfig.OTP_RANDOM.nextInt(1_000_000));

            HttpSession legacySession = httpRequest.getSession(true);
            legacySession.setAttribute("lcdjp_legacy_otp_username", username);
            legacySession.setAttribute("lcdjp_legacy_otp", otp);
            legacySession.setAttribute("lcdjp_legacy_otp_expiry",
                    System.currentTimeMillis() + OtpConfig.OTP_LIFETIME_MILLIS);
            legacySession.setAttribute("lcdjp_legacy_otp_sent_at", System.currentTimeMillis());
            legacySession.setAttribute("lcdjp_legacy_otp_attempts", 0);

            String emailBody = "<h1>Your OTP Code</h1>"
                    + "<p>Your verification code is: <strong>" + otp + "</strong></p>"
                    + "<p>This code will expire in 5 minutes.</p>";

            emailService.sendEmail(email, "Your Login OTP", emailBody);

            return ResponseEntity.ok(Map.of("success", true, "message", "OTP sent to your email"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request, HttpServletRequest httpRequest) {
        try {

            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Missing or invalid token"));
            }

            String token = authHeader.substring(7);
            String username;
            try {
                username = jwtUtil.extractUsername(token);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid token"));
            }

            if (username == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }

            String currentPassword = request.getCurrentPassword();
            String newPassword = request.getNewPassword();
            String confirmPassword = request.getConfirmPassword();

            if (confirmPassword == null || !newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Passwords do not match"));
            }

            String sql = "SELECT password_hash, email, phone FROM users WHERE username = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            String dbPassword = (String) results.get(0).get("password_hash");
            if (dbPassword == null || currentPassword == null
                    || !passwordEncoder.matches(currentPassword, dbPassword)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Current password is incorrect"));
            }

            String email = (String) results.get(0).get("email");
            String phone = (String) results.get(0).get("phone");
            if ((email == null || email.trim().isEmpty()) && (phone == null || phone.trim().isEmpty())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "No email or phone is on file for this account. Contact a System Administrator."));
            }

            HttpSession session = httpRequest.getSession(true);
            session.setAttribute("lcdjp_fpc_pending_username", username);
            session.setAttribute("lcdjp_fpc_pending_hash", passwordEncoder.encode(newPassword));

            Map<String, Object> sendResult = sendForcedPasswordChangeOtp(session, username, email, phone);
            if (Boolean.FALSE.equals(sendResult.get("success"))) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(sendResult);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("otpRequired", true);
            response.put("channel", sendResult.get("channel"));
            response.put("message", sendResult.get("message"));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Error changing password: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PostMapping("/change-password/resend-otp")
    public ResponseEntity<?> resendChangePasswordOtp(HttpServletRequest httpRequest) {
        try {
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Missing or invalid token"));
            }
            String token = authHeader.substring(7);
            String username;
            try {
                username = jwtUtil.extractUsername(token);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid token"));
            }

            HttpSession session = httpRequest.getSession(false);
            String pendingUsername = session == null ? null
                    : (String) session.getAttribute("lcdjp_fpc_pending_username");
            if (session == null || pendingUsername == null || !pendingUsername.equals(username)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "No pending password change was found. Please start again."));
            }

            String sql = "SELECT email, phone FROM users WHERE username = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);
            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
            }
            String email = (String) results.get(0).get("email");
            String phone = (String) results.get(0).get("phone");

            Map<String, Object> sendResult = sendForcedPasswordChangeOtp(session, username, email, phone);
            if (Boolean.FALSE.equals(sendResult.get("success"))) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(sendResult);
            }
            return ResponseEntity.ok(sendResult);

        } catch (Exception e) {
            logger.error("❌ Error resending change-password OTP: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PostMapping("/change-password/verify-otp")
    public ResponseEntity<?> verifyChangePasswordOtp(@Valid @RequestBody OtpOnlyRequest request,
                                                       HttpServletRequest httpRequest) {
        try {
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Missing or invalid token"));
            }
            String token = authHeader.substring(7);
            String username;
            try {
                username = jwtUtil.extractUsername(token);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid token"));
            }

            String otpCode = request.getOtp();
            if (otpCode == null || !otpCode.matches("\\d{6}")) {
                return ResponseEntity.badRequest().body(Map.of("error", "OTP must be a 6-digit code"));
            }

            HttpSession session = httpRequest.getSession(false);
            String pendingUsername = session == null ? null
                    : (String) session.getAttribute("lcdjp_fpc_pending_username");
            String pendingHash = session == null ? null
                    : (String) session.getAttribute("lcdjp_fpc_pending_hash");
            String otpUsername = session == null ? null
                    : (String) session.getAttribute("lcdjp_fpc_otp_username");

            if (session == null || pendingUsername == null || !pendingUsername.equals(username)
                    || otpUsername == null || !otpUsername.equals(username) || pendingHash == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "No pending password change was found. Please start again."));
            }

            int attempts = session.getAttribute("lcdjp_fpc_otp_attempts") instanceof Number
                    ? ((Number) session.getAttribute("lcdjp_fpc_otp_attempts")).intValue() : 0;
            if (attempts >= OtpConfig.MAX_OTP_ATTEMPTS) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("error", "Too many incorrect attempts. Request a new code."));
            }

            Object expiryObj = session.getAttribute("lcdjp_fpc_otp_expiry");
            long expiry = expiryObj instanceof Number ? ((Number) expiryObj).longValue() : 0L;
            String pendingOtp = session.getAttribute("lcdjp_fpc_otp_code") == null
                    ? null : String.valueOf(session.getAttribute("lcdjp_fpc_otp_code"));

            if (pendingOtp == null || expiry <= System.currentTimeMillis()) {
                session.removeAttribute("lcdjp_fpc_otp_code");
                session.removeAttribute("lcdjp_fpc_otp_expiry");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired OTP code. Please request a new one."));
            }

            if (!MessageDigest.isEqual(
                    pendingOtp.getBytes(StandardCharsets.UTF_8),
                    otpCode.getBytes(StandardCharsets.UTF_8))) {
                session.setAttribute("lcdjp_fpc_otp_attempts", attempts + 1);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Incorrect OTP code"));
            }

            String roleSql = "SELECT role, district FROM users WHERE username = ?";
            Map<String, Object> roleResult = jdbcTemplate.queryForMap(roleSql, username);
            String dbRole = (String) roleResult.get("role");
            String dbDistrict = (String) roleResult.get("district");

            String updateSql = "UPDATE users SET password_hash = ?, password_changed = 1 WHERE username = ?";
            jdbcTemplate.update(updateSql, pendingHash, username);

            auditLogService.logAction(
                    username,
                    "User",
                    "PASSWORD_CHANGED",
                    "user",
                    username,
                    "Password changed successfully after OTP verification"
            );

            session.removeAttribute("lcdjp_fpc_pending_username");
            session.removeAttribute("lcdjp_fpc_pending_hash");
            session.removeAttribute("lcdjp_fpc_otp_username");
            session.removeAttribute("lcdjp_fpc_otp_code");
            session.removeAttribute("lcdjp_fpc_otp_expiry");
            session.removeAttribute("lcdjp_fpc_otp_sent_at");
            session.removeAttribute("lcdjp_fpc_otp_attempts");

            String newToken = jwtUtil.generateToken(username, dbRole, dbDistrict);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password changed successfully",
                    "token", newToken
            ));

        } catch (Exception e) {
            logger.error("❌ Error verifying change-password OTP: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    private Map<String, Object> sendForcedPasswordChangeOtp(HttpSession session, String username,
                                                              String email, String phone) throws Exception {
        Object sentAt = session.getAttribute("lcdjp_fpc_otp_sent_at");
        if (sentAt instanceof Number
                && System.currentTimeMillis() - ((Number) sentAt).longValue() < OtpConfig.OTP_RESEND_COOLDOWN_MILLIS) {
            return Map.of("success", false, "error", "Please wait before requesting another verification code");
        }

        String otp = String.format("%06d", OtpConfig.OTP_RANDOM.nextInt(1_000_000));
        String channel;
        if (email != null && !email.trim().isEmpty()) {
            String body = "<h1>Your OTP Code</h1>"
                    + "<p>Your verification code is: <strong>" + otp + "</strong></p>"
                    + "<p>Enter this code to finish setting your new password. It expires in 5 minutes.</p>";
            emailService.sendEmail(email.trim(), "Your JusticeLink Verification Code", body);
            channel = "email";
        } else {
            smsService.sendSms(phone.trim(), "Your JusticeLink verification code is " + otp + ". It expires in 5 minutes.");
            channel = "sms";
        }

        session.setAttribute("lcdjp_fpc_otp_username", username);
        session.setAttribute("lcdjp_fpc_otp_code", otp);
        session.setAttribute("lcdjp_fpc_otp_expiry", System.currentTimeMillis() + OtpConfig.OTP_LIFETIME_MILLIS);
        session.setAttribute("lcdjp_fpc_otp_sent_at", System.currentTimeMillis());
        session.setAttribute("lcdjp_fpc_otp_attempts", 0);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("channel", channel);
        result.put("message", "email".equals(channel)
                ? "A verification code was sent to the email on file. Enter it below to finish."
                : "A verification code was sent to the phone number on file. Enter it below to finish.");
        return result;
    }
}
