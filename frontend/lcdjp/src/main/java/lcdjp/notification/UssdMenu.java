package lcdjp.notification;

import java.util.List;
import java.util.Optional;

/**
 * The USSD menu as a pure function of the phone number and the cumulative input text.
 *
 * Africa's Talking sends the whole path the person has typed so far, joined with '*' (for example
 * "1*2*Wakiso"). The menu keeps no state between requests, so a dropped session never leaves
 * anything half-saved: a report is created only on the final confirmation step.
 *
 * Replies start with "CON " (session continues) or "END " (session closes). Replies stay short
 * because USSD screens are small, and they never include case descriptions or personal details.
 */
public final class UssdMenu {

    static final int MAX_FIELD = 80;

    private static final String[] TYPE_LABELS = {"Land Matter", "Family Dispute", "Others", "Others"};
    private static final String[] TYPE_PROMPTS = {"Land", "Family or violence", "Someone arrested", "Something else"};

    private final UssdBackend backend;

    public UssdMenu(UssdBackend backend) {
        this.backend = backend;
    }

    public String handle(String phoneNumber, String rawText) {
        String[] steps = split(rawText);

        if (steps.length == 0) {
            return "CON JusticeLink\n1. Report a problem\n2. Check my case\n3. Emergency numbers";
        }

        switch (steps[0]) {
            case "1": return report(phoneNumber, steps);
            case "2": return status(phoneNumber);
            case "3": return emergency();
            default:  return "END Sorry, that option does not exist. Dial again to start.";
        }
    }

    private String emergency() {
        return "END Danger now? Police: 999 or 112.\nChild in trouble: 116.\n"
                + "Arrested? A person must be taken to court within 48 hours. Ask for a lawyer.";
    }

    private String status(String phoneNumber) {
        Optional<String> citizen = backend.citizenForPhone(phoneNumber);
        if (citizen.isEmpty()) return notRegistered();
        List<String> lines = backend.recentCaseStatusLines(citizen.get(), 3);
        if (lines.isEmpty()) return "END You have no reports yet.";
        return "END " + String.join("\n", lines);
    }

    private String report(String phoneNumber, String[] steps) {
        if (steps.length == 1) {
            StringBuilder sb = new StringBuilder("CON What is it about?");
            for (int i = 0; i < TYPE_PROMPTS.length; i++) {
                sb.append("\n").append(i + 1).append(". ").append(TYPE_PROMPTS[i]);
            }
            return sb.toString();
        }

        int typeIndex = parseChoice(steps[1], TYPE_PROMPTS.length);
        if (typeIndex < 0) return "END Sorry, that option does not exist. Dial again to start.";

        if (steps.length == 2) return "CON Which district are you in?";

        String district = clean(steps[2]);
        if (district.isEmpty()) return "END We need your district. Dial again to start.";

        if (steps.length == 3) {
            return typeIndex == 2
                    ? "CON Who is held, and where? (a few words)"
                    : "CON Say what happened in a few words.";
        }

        String text = clean(steps[3]);
        if (text.isEmpty()) return "END We need a few words about it. Dial again to start.";

        if (steps.length == 4) {
            return "CON Send this report?\n1. Yes\n2. No";
        }

        if ("1".equals(steps[4])) {
            Optional<String> citizen = backend.citizenForPhone(phoneNumber);
            if (citizen.isEmpty()) return notRegistered();
            String described = typeIndex == 2 ? "Person arrested or detained: " + text : text;
            String reference = backend.createReport(citizen.get(), phoneNumber,
                    TYPE_LABELS[typeIndex], district, described);
            return "END Report received. Reference: " + reference
                    + ".\nDial and choose 2 to check it. Danger now? Call 999.";
        }
        return "END Report not sent.";
    }

    private String notRegistered() {
        return "END This number is not registered on JusticeLink. Register on the website or app first "
                + "so we can link reports to you. Danger now? Call 999.";
    }

    private static String[] split(String rawText) {
        if (rawText == null || rawText.isBlank()) return new String[0];
        return rawText.split("\\*", -1);
    }

    private static int parseChoice(String s, int max) {
        try {
            int n = Integer.parseInt(s.trim());
            return n >= 1 && n <= max ? n - 1 : -1;
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /** Trims, strips control characters, and caps the length of anything the person typed. */
    static String clean(String s) {
        if (s == null) return "";
        String t = s.replaceAll("\\p{Cntrl}", " ").trim();
        return t.length() > MAX_FIELD ? t.substring(0, MAX_FIELD) : t;
    }
}
