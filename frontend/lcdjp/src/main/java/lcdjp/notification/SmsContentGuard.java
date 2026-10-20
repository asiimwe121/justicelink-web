package lcdjp.notification;

import lcdjp.cases.JurisdictionRouting;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Last line of defence before a message leaves for a phone: SMS can be read on lock screens and on shared
 * phones, so it must never carry what a report is about. Messages about a violence, child-protection,
 * detention or serious-crime matter (as judged by {@link JurisdictionRouting}), or about someone's health,
 * are refused. OTPs, reset links and "you have an update, open the app" style messages pass.
 *
 * The refusal names only the category, never the message text, so the sensitive wording is not logged.
 */
public final class SmsContentGuard {

    private static final Pattern URL = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);
    private static final Pattern HEALTH = Pattern.compile(
            "\\b(hiv|aids|pregnan\\w*|abortion|miscarriage)\\b", Pattern.CASE_INSENSITIVE);

    private SmsContentGuard() {
    }

    /** Thrown when a message must not be sent by SMS. */
    public static final class SensitiveSmsException extends IllegalArgumentException {
        SensitiveSmsException(String category) {
            super("SMS blocked: message contains " + category + " wording; send a neutral notice instead");
        }
    }

    public static void requireNeutral(String message) {
        String reason = sensitiveCategory(message);
        if (reason != null) throw new SensitiveSmsException(reason);
    }

    /** @return the kind of sensitive wording found, or null when the message is neutral. */
    static String sensitiveCategory(String message) {
        if (message == null || message.isBlank()) return null;
        // Links carry random tokens; scanning them could only produce false alarms.
        String text = URL.matcher(message).replaceAll(" ").toLowerCase(Locale.ROOT);

        JurisdictionRouting.Track track = JurisdictionRouting.assess(null, text).track;
        switch (track) {
            case PROTECTION:
                return "violence or child-protection";
            case DETENTION:
                return "detention";
            case CRIMINAL_SERIOUS:
                return "serious-crime";
            default:
                break;
        }
        if (HEALTH.matcher(text).find()) return "health";
        return null;
    }
}
