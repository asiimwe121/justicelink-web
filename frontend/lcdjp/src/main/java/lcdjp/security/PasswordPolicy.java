package lcdjp.security;

/**
 * Minimum password length, shared by every place that sets a password.
 * Default 8 (the previous hard-coded value); raise it with PASSWORD_MIN_LENGTH (or -Dapp.password.min-length).
 * Values below 8 are ignored so the setting can only tighten the policy.
 */
public final class PasswordPolicy {

    private static final int DEFAULT_MIN_LENGTH = 8;

    private PasswordPolicy() {}

    public static int minLength() {
        String v = System.getProperty("app.password.min-length", System.getenv("PASSWORD_MIN_LENGTH"));
        if (v == null || v.isBlank()) return DEFAULT_MIN_LENGTH;
        try {
            return Math.max(DEFAULT_MIN_LENGTH, Integer.parseInt(v.trim()));
        } catch (NumberFormatException e) {
            return DEFAULT_MIN_LENGTH;
        }
    }

    public static boolean tooShort(String password) {
        return password == null || password.length() < minLength();
    }

    public static String message() {
        return "Password must be at least " + minLength() + " characters";
    }
}
