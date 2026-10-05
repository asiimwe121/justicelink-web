package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

@Service
public class LoginOtpService {

    private static final String ATTR_USERNAME    = "lcdjp_login_otp_username";
    private static final String ATTR_CODE        = "lcdjp_login_otp_code";
    private static final String ATTR_EXPIRY      = "lcdjp_login_otp_expiry";
    private static final String ATTR_SENT_AT     = "lcdjp_login_otp_sent_at";
    private static final String ATTR_ATTEMPTS    = "lcdjp_login_otp_attempts";
    private static final String ATTR_REMEMBER_ME = "lcdjp_login_otp_remember_me";

    @Autowired
    private EmailService emailService;
    @Autowired
    private SmsService smsService;

    public Map<String, Object> sendOtp(HttpServletRequest request, String username,
                                        String email, String phone, boolean rememberMe) throws Exception {
        HttpSession session = request.getSession(true);

        Object lastUsername = session.getAttribute(ATTR_USERNAME);
        Object lastSentAt = session.getAttribute(ATTR_SENT_AT);
        if (username.equals(lastUsername) && lastSentAt instanceof Number
                && System.currentTimeMillis() - ((Number) lastSentAt).longValue() < OtpConfig.OTP_RESEND_COOLDOWN_MILLIS) {
            throw new TooManyRequestsException("Please wait before requesting another code");
        }

        String trimmedEmail = email == null ? "" : email.trim();
        String trimmedPhone = phone == null ? "" : phone.trim();

        String otp = String.format("%06d", OtpConfig.OTP_RANDOM.nextInt(1_000_000));
        String channel;

        if (!trimmedEmail.isEmpty()) {
            String body = "<h1>🔐 Your Login Code</h1>"
                    + "<p>Your JusticeLink login verification code is: <strong>" + otp + "</strong></p>"
                    + "<p>Enter this code to finish signing in. It expires in 5 minutes. "
                    + "If you didn't try to log in, you can safely ignore this email.</p>";
            emailService.sendEmail(trimmedEmail, "Your JusticeLink Login Code", body);
            channel = "email";
        } else if (!trimmedPhone.isEmpty()) {
            smsService.sendSms(trimmedPhone,
                    "Your JusticeLink login code is " + otp + ". It expires in 5 minutes.");
            channel = "sms";
        } else {
            throw new NoContactOnFileException("No email or phone number is on file to send a login code to");
        }

        session.setAttribute(ATTR_USERNAME, username);
        session.setAttribute(ATTR_CODE, otp);
        session.setAttribute(ATTR_EXPIRY, System.currentTimeMillis() + OtpConfig.OTP_LIFETIME_MILLIS);
        session.setAttribute(ATTR_SENT_AT, System.currentTimeMillis());
        session.setAttribute(ATTR_ATTEMPTS, 0);
        session.setAttribute(ATTR_REMEMBER_ME, rememberMe);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("channel", channel);
        result.put("message", "email".equals(channel)
                ? "A login code was sent to your email address."
                : "A login code was sent to your phone number.");
        return result;
    }

    public static final class VerifyResult {
        public final boolean success;
        public final String error;
        public final boolean rememberMe;

        private VerifyResult(boolean success, String error, boolean rememberMe) {
            this.success = success;
            this.error = error;
            this.rememberMe = rememberMe;
        }

        static VerifyResult ok(boolean rememberMe) {
            return new VerifyResult(true, null, rememberMe);
        }

        static VerifyResult fail(String error) {
            return new VerifyResult(false, error, false);
        }
    }

    public VerifyResult verifyOtp(HttpServletRequest request, String username, String otpCode) {
        if (otpCode == null || !otpCode.matches("\\d{6}")) {
            return VerifyResult.fail("OTP must be a 6-digit code");
        }

        HttpSession session = request.getSession(false);
        if (session == null || !username.equals(session.getAttribute(ATTR_USERNAME))) {
            return VerifyResult.fail("No active login verification was found. Please log in again.");
        }

        int attempts = session.getAttribute(ATTR_ATTEMPTS) instanceof Number
                ? ((Number) session.getAttribute(ATTR_ATTEMPTS)).intValue() : 0;
        if (attempts >= OtpConfig.MAX_OTP_ATTEMPTS) {
            clear(session);
            return VerifyResult.fail("Too many incorrect attempts. Please log in again.");
        }

        Object expiryObj = session.getAttribute(ATTR_EXPIRY);
        long expiry = expiryObj instanceof Number ? ((Number) expiryObj).longValue() : 0L;
        String pendingOtp = session.getAttribute(ATTR_CODE) == null
                ? null : String.valueOf(session.getAttribute(ATTR_CODE));

        if (pendingOtp == null || expiry <= System.currentTimeMillis()) {
            clear(session);
            return VerifyResult.fail("Your code has expired. Please log in again.");
        }

        if (!MessageDigest.isEqual(
                pendingOtp.getBytes(StandardCharsets.UTF_8),
                otpCode.getBytes(StandardCharsets.UTF_8))) {
            session.setAttribute(ATTR_ATTEMPTS, attempts + 1);
            return VerifyResult.fail("Incorrect code. Please try again.");
        }

        boolean rememberMe = Boolean.TRUE.equals(session.getAttribute(ATTR_REMEMBER_ME));
        clear(session);
        return VerifyResult.ok(rememberMe);
    }

    public boolean hasPending(HttpServletRequest request, String username) {
        HttpSession session = request.getSession(false);
        return session != null && username != null && username.equals(session.getAttribute(ATTR_USERNAME));
    }

    private void clear(HttpSession session) {
        session.removeAttribute(ATTR_USERNAME);
        session.removeAttribute(ATTR_CODE);
        session.removeAttribute(ATTR_EXPIRY);
        session.removeAttribute(ATTR_SENT_AT);
        session.removeAttribute(ATTR_ATTEMPTS);
        session.removeAttribute(ATTR_REMEMBER_ME);
    }

    public static class TooManyRequestsException extends RuntimeException {
        public TooManyRequestsException(String message) { super(message); }
    }

    public static class NoContactOnFileException extends RuntimeException {
        public NoContactOnFileException(String message) { super(message); }
    }
}
