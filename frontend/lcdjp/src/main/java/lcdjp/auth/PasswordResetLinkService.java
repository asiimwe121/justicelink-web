package lcdjp.auth;

import lcdjp.notification.EmailService;
import lcdjp.security.LoginLockoutService;
import lcdjp.security.SessionRevocationService;
import lcdjp.notification.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class PasswordResetLinkService {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(PasswordResetLinkService.class);

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter EXPIRY_FORMAT = DateTimeFormatter.ofPattern("HH:mm 'on' d MMM yyyy");

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private EmailService emailService;
    @Autowired
    private SmsService smsService;
    @Autowired
    private LoginLockoutService loginLockoutService;
    @Autowired
    private SessionRevocationService sessionRevocationService;

    @Value("${app.base-url:https://justicelinkug.org}")
    private String baseUrl;
    @Value("${app.support.email:support@justicelinkug.org}")
    private String supportEmail;
    @Value("${app.support.name:JusticeLink Support}")
    private String supportName;
    @Value("${app.password-reset.link-ttl-minutes:60}")
    private long linkTtlMinutes;

    public static final class DeliveryResult {
        public final boolean emailSent;
        public final boolean smsSent;
        public final boolean emailAttempted;
        public final boolean smsAttempted;

        DeliveryResult(boolean emailAttempted, boolean emailSent, boolean smsAttempted, boolean smsSent) {
            this.emailAttempted = emailAttempted;
            this.emailSent = emailSent;
            this.smsAttempted = smsAttempted;
            this.smsSent = smsSent;
        }

        public boolean anyAttempted() {
            return emailAttempted || smsAttempted;
        }

        public boolean anySent() {
            return emailSent || smsSent;
        }

        public List<String> channels() {
            List<String> channels = new ArrayList<>();
            if (emailSent) channels.add("email");
            if (smsSent) channels.add("sms");
            return channels;
        }
    }

    public long getLinkTtlMinutes() {
        return linkTtlMinutes;
    }

    public DeliveryResult issueAndSend(Map<String, Object> user, String createdBy) {
        String username = String.valueOf(user.get("username"));
        String email = text(user.get("email"));
        String phone = text(user.get("phone"));

        String token = newToken();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(linkTtlMinutes);

        jdbcTemplate.update(
                "UPDATE password_reset_links SET used_at = ? WHERE username = ? AND used_at IS NULL",
                now, username);
        jdbcTemplate.update(
                "INSERT INTO password_reset_links (username, token_hash, created_by, created_at, expires_at) "
                        + "VALUES (?, ?, ?, ?, ?)",
                username, hash(token), createdBy, now, expiresAt);

        String link = linkFor(token);
        String firstName = text(user.get("first_name"));

        boolean emailSent = false;
        boolean smsSent = false;

        if (!email.isEmpty()) {
            try {
                emailService.sendEmailFrom(supportEmail, supportName, email,
                        "Reset your JusticeLink password",
                        buildEmailBody(firstName, username, link, expiresAt));
                emailSent = true;
            } catch (Exception e) {
                logger.error("Reset link email failed for '{}': {}", username, e.getMessage());
            }
        }
        if (!phone.isEmpty()) {
            try {
                smsService.sendSms(phone, buildSmsBody(firstName, link));
                smsSent = true;
            } catch (Exception e) {
                logger.error("Reset link SMS failed for '{}': {}", username, e.getMessage());
            }
        }

        DeliveryResult result = new DeliveryResult(!email.isEmpty(), emailSent, !phone.isEmpty(), smsSent);
        if (!result.anySent()) {
            jdbcTemplate.update(
                    "UPDATE password_reset_links SET used_at = ? WHERE token_hash = ?",
                    LocalDateTime.now(), hash(token));
        }
        return result;
    }

    public String findValidUsername(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username FROM password_reset_links WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
                hash(token.trim()), LocalDateTime.now());
        return rows.isEmpty() ? null : String.valueOf(rows.get(0).get("username"));
    }

    @Transactional
    public String completeReset(String token, String newPasswordHash) {
        String username = findValidUsername(token);
        if (username == null) {
            return null;
        }
        LocalDateTime now = LocalDateTime.now();
        int claimed = jdbcTemplate.update(
                "UPDATE password_reset_links SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
                now, hash(token.trim()), now);
        if (claimed != 1) {
            return null;
        }
        int updated = jdbcTemplate.update(
                "UPDATE users SET password_hash = ?, password_changed = ? WHERE username = ?",
                newPasswordHash, true, username);
        if (updated < 1) {
            throw new IllegalStateException("User no longer exists: " + username);
        }
        loginLockoutService.unlock(username);
        sessionRevocationService.revokeAll(username);
        jdbcTemplate.update(
                "UPDATE password_reset_links SET used_at = ? WHERE username = ? AND used_at IS NULL",
                now, username);
        jdbcTemplate.update(
                "UPDATE password_reset_tokens SET used = true WHERE username = ? AND used = false",
                username);
        return username;
    }

    String linkFor(String token) {
        String base = baseUrl == null ? "" : baseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/reset-password.html?token=" + token;
    }

    String buildEmailBody(String firstName, String username, String link, LocalDateTime expiresAt) {
        String greeting = firstName.isEmpty() ? "Hello," : "Hello " + HtmlUtils.htmlEscape(firstName) + ",";
        String safeLink = HtmlUtils.htmlEscape(link);
        String safeSupport = HtmlUtils.htmlEscape(supportEmail);
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1a2e;max-width:560px;\">"
                + "<h2 style=\"color:#1a237e;margin:0 0 16px;\">Reset your JusticeLink password</h2>"
                + "<p>" + greeting + "</p>"
                + "<p>A JusticeLink administrator has sent you a link so you can choose a new password for your account "
                + "<strong>" + HtmlUtils.htmlEscape(username) + "</strong>.</p>"
                + "<p style=\"margin:24px 0;\"><a href=\"" + safeLink + "\" "
                + "style=\"background:#1a237e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;"
                + "font-weight:bold;display:inline-block;\">Reset my password</a></p>"
                + "<p>If the button does not work, copy and paste this address into your browser:<br>"
                + "<a href=\"" + safeLink + "\" style=\"color:#1a237e;word-break:break-all;\">" + safeLink + "</a></p>"
                + "<p><strong>This link can be used once and expires in " + linkTtlMinutes + " minutes</strong> (at "
                + expiresAt.format(EXPIRY_FORMAT) + "). If it has expired, ask your administrator or support to send a new one.</p>"
                + "<p>If you were not expecting this message, do not open the link &mdash; your password has not been changed. "
                + "Please tell us at <a href=\"mailto:" + safeSupport + "\" style=\"color:#1a237e;\">" + safeSupport + "</a>.</p>"
                + "<p style=\"color:#555;font-size:13px;\">JusticeLink staff will never ask you for your password or a verification code.</p>"
                + "<p>Regards,<br>JusticeLink Support Team</p>"
                + "</div>";
    }

    String buildSmsBody(String firstName, String link) {
        return "JusticeLink: " + (firstName.isEmpty() ? "Hello" : "Hello " + firstName)
                + ", an administrator sent you a link to reset your password:\n" + link
                + "\nIt works once and expires in " + linkTtlMinutes
                + " minutes. Not expecting this? Don't open it and contact " + supportEmail + ".";
    }

    static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private static String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
