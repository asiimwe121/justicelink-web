package lcdjp;

import java.security.SecureRandom;

public final class OtpConfig {

    private OtpConfig() {
    }

    public static final SecureRandom OTP_RANDOM = new SecureRandom();
    public static final long OTP_LIFETIME_MILLIS = 5L * 60L * 1000L;
    public static final long OTP_RESEND_COOLDOWN_MILLIS = 60L * 1000L;
    public static final int MAX_OTP_ATTEMPTS = 5;
}
