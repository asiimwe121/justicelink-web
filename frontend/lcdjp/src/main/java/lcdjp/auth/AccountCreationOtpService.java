package lcdjp.auth;

import lcdjp.notification.EmailService;
import lcdjp.notification.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

@Service
public class AccountCreationOtpService {

    private static final SecureRandom OTP_RANDOM = new SecureRandom();
    private static final long OTP_LIFETIME_MILLIS = 5L * 60L * 1000L;
    private static final long OTP_RESEND_COOLDOWN_MILLIS = 60L * 1000L;
    private static final long VERIFIED_GRACE_MILLIS = 15L * 60L * 1000L;
    private static final int MAX_OTP_ATTEMPTS = 5;

    private static final String ATTR_KEY      = "lcdjp_acct_otp_key";
    private static final String ATTR_CODE     = "lcdjp_acct_otp_code";
    private static final String ATTR_EXPIRY   = "lcdjp_acct_otp_expiry";
    private static final String ATTR_SENT_AT  = "lcdjp_acct_otp_sent_at";
    private static final String ATTR_ATTEMPTS = "lcdjp_acct_otp_attempts";

    private static final String ATTR_VERIFIED_KEY = "lcdjp_acct_verified_key";
    private static final String ATTR_VERIFIED_AT  = "lcdjp_acct_verified_at";

    @Autowired
    private EmailService emailService;
    @Autowired
    private SmsService smsService;

    private String contactKey(String purpose, String email, String phone) {
        String e = email == null ? "" : email.trim().toLowerCase();
        String p = phone == null ? "" : phone.replaceAll("\\D", "");
        return (purpose == null ? "" : purpose.trim().toUpperCase()) + "|" + e + "|" + p;
    }

    public Map<String, Object> sendOtp(HttpServletRequest request, String purpose,
                                        String email, String phone) throws Exception {
        String trimmedEmail = email == null ? "" : email.trim();
        String trimmedPhone = phone == null ? "" : phone.trim();
        if (trimmedEmail.isEmpty() && trimmedPhone.isEmpty()) {
            throw new IllegalArgumentException("An email address or phone number is required");
        }

        HttpSession session = request.getSession(true);
        String key = contactKey(purpose, trimmedEmail, trimmedPhone);

        Object lastKey = session.getAttribute(ATTR_KEY);
        Object lastSentAt = session.getAttribute(ATTR_SENT_AT);
        if (key.equals(lastKey) && lastSentAt instanceof Number
                && System.currentTimeMillis() - ((Number) lastSentAt).longValue() < OTP_RESEND_COOLDOWN_MILLIS) {
            throw new TooManyRequestsException("Please wait before requesting another verification code");
        }

        String otp = String.format("%06d", OTP_RANDOM.nextInt(1_000_000));
        String channel;

        if (!trimmedEmail.isEmpty()) {
            String body = "<h1>Your OTP Code</h1>"
                    + "<p>Your verification code is: <strong>" + otp + "</strong></p>"
                    + "<p>This code confirms this contact detail before a new account is created for it. "
                    + "It expires in 5 minutes.</p>";
            emailService.sendEmail(trimmedEmail, "Your JusticeLink Account Verification Code", body);
            channel = "email";
        } else {
            smsService.sendSms(trimmedPhone,
                    "Your JusticeLink verification code is " + otp + ". It expires in 5 minutes.");
            channel = "sms";
        }

        session.setAttribute(ATTR_KEY, key);
        session.setAttribute(ATTR_CODE, otp);
        session.setAttribute(ATTR_EXPIRY, System.currentTimeMillis() + OTP_LIFETIME_MILLIS);
        session.setAttribute(ATTR_SENT_AT, System.currentTimeMillis());
        session.setAttribute(ATTR_ATTEMPTS, 0);
        session.removeAttribute(ATTR_VERIFIED_KEY);
        session.removeAttribute(ATTR_VERIFIED_AT);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("channel", channel);
        result.put("message", "email".equals(channel)
                ? "A verification code was sent to that email address."
                : "A verification code was sent to that phone number.");
        return result;
    }

    public Map<String, Object> verifyOtp(HttpServletRequest request, String purpose,
                                          String email, String phone, String otpCode) {
        if (otpCode == null || !otpCode.matches("\\d{6}")) {
            return error("OTP must be a 6-digit code");
        }

        String key = contactKey(purpose, email, phone);
        HttpSession session = request.getSession(false);
        if (session == null || !key.equals(session.getAttribute(ATTR_KEY))) {
            return error("No active verification code was found for these contact details. Request a new one.");
        }

        int attempts = session.getAttribute(ATTR_ATTEMPTS) instanceof Number
                ? ((Number) session.getAttribute(ATTR_ATTEMPTS)).intValue() : 0;
        if (attempts >= MAX_OTP_ATTEMPTS) {
            return error("Too many incorrect attempts. Request a new code.");
        }

        Object expiryObj = session.getAttribute(ATTR_EXPIRY);
        long expiry = expiryObj instanceof Number ? ((Number) expiryObj).longValue() : 0L;
        String pendingOtp = session.getAttribute(ATTR_CODE) == null
                ? null : String.valueOf(session.getAttribute(ATTR_CODE));

        if (pendingOtp == null || expiry <= System.currentTimeMillis()) {
            session.removeAttribute(ATTR_CODE);
            session.removeAttribute(ATTR_EXPIRY);
            return error("Invalid or expired OTP code. Please request a new one.");
        }

        if (!MessageDigest.isEqual(
                pendingOtp.getBytes(StandardCharsets.UTF_8),
                otpCode.getBytes(StandardCharsets.UTF_8))) {
            session.setAttribute(ATTR_ATTEMPTS, attempts + 1);
            return error("Incorrect OTP code");
        }

        session.setAttribute(ATTR_VERIFIED_KEY, key);
        session.setAttribute(ATTR_VERIFIED_AT, System.currentTimeMillis());
        session.removeAttribute(ATTR_CODE);
        session.removeAttribute(ATTR_EXPIRY);
        session.removeAttribute(ATTR_SENT_AT);
        session.removeAttribute(ATTR_ATTEMPTS);
        session.removeAttribute(ATTR_KEY);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Contact details verified");
        return result;
    }

    public boolean isVerified(HttpServletRequest request, String purpose, String email, String phone) {
        HttpSession session = request.getSession(false);
        if (session == null) return false;
        String key = contactKey(purpose, email, phone);
        Object verifiedKey = session.getAttribute(ATTR_VERIFIED_KEY);
        Object verifiedAt = session.getAttribute(ATTR_VERIFIED_AT);
        if (!key.equals(verifiedKey) || !(verifiedAt instanceof Number)) return false;
        return System.currentTimeMillis() - ((Number) verifiedAt).longValue() < VERIFIED_GRACE_MILLIS;
    }

    public void consume(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return;
        session.removeAttribute(ATTR_VERIFIED_KEY);
        session.removeAttribute(ATTR_VERIFIED_AT);
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("error", message);
        return result;
    }

    public static class TooManyRequestsException extends RuntimeException {
        public TooManyRequestsException(String message) { super(message); }
    }
}
