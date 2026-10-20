package lcdjp.chat;

import lcdjp.legal.LegalSourceReference;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Fixed rules for what the legal assistant's chat reply must contain, applied after the model has
 * answered (or instead of it). These are plain code, not prompt wording, so they hold even when the
 * model ignores its instructions:
 *
 *  - a legal question with no relevant source in the knowledge base is not sent to the model at all;
 *  - an answer that used sources always ends with the sources used and an "information, not legal
 *    advice" notice;
 *  - a message that describes danger gets the emergency numbers first.
 *
 * LEGAL REVIEW NEEDED for the wording and the numbers (999/112 police, 116 Uganda Child Helpline).
 * Matching works on English text only.
 */
public final class ChatReplyPolicy {

    private ChatReplyPolicy() {}

    public enum Danger { IMMEDIATE_DANGER, CHILD_AT_RISK, SELF_HARM }

    static final String DISCLAIMER =
            "This is general legal information, not legal advice. For advice about your own case, "
                    + "please speak to a lawyer or a legal aid provider.";

    public static final String NO_SOURCE_REPLY =
            "I could not find a reliable answer to this in the legal materials I use, so I will not guess. "
                    + "Please speak to a lawyer, a legal aid provider or your Local Council office, who can "
                    + "advise you properly. You can find legal aid providers in the Legal Organisations section "
                    + "of JusticeLink.\n\n" + DISCLAIMER;

    private static Pattern p(String regex) {
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
    }

    private static final Pattern IMMEDIATE_DANGER = p(
            "\\b((?:going|want(?:s|ed)?|threat\\w*|trying|tried|will) to (?:kill|stab|shoot|burn) (?:me|us)|"
            + "kill(?:ing)? me|beating me|beats me|hitting me|chok\\w* me|strangl\\w*|"
            + "locked me (?:in|up)|(?:i am|i'm|we are|we're) not safe|not safe (?:at home|here)|"
            + "(?:i am|i'm|we are|we're) in danger|has a (?:knife|gun|panga)|with a (?:knife|gun|panga)|"
            + "raping me|forcing me)\\b");

    private static final Pattern CHILD_AT_RISK = p(
            "\\b(?:(?:my|the|a) (?:child|baby|girl|boy|daughter|son|niece|nephew|sister|brother) "
            + "(?:is|was|has been|are|were) (?:being )?(?:beaten|abused|raped|defiled|hurt|mistreated|"
            + "locked|starved)|defile\\w*|child abuse|abusing (?:a|the|my) child)\\b");

    private static final Pattern SELF_HARM = p(
            "\\b(?:want(?:ed)? to die|kill myself|end my life|ending my life|suicid\\w*|"
            + "(?:do not|don't|dont) want to (?:live|be alive)|better off dead)\\b");

    public static Set<Danger> detectDanger(String message) {
        Set<Danger> found = EnumSet.noneOf(Danger.class);
        if (message == null || message.isBlank()) return found;
        if (IMMEDIATE_DANGER.matcher(message).find()) found.add(Danger.IMMEDIATE_DANGER);
        if (CHILD_AT_RISK.matcher(message).find()) found.add(Danger.CHILD_AT_RISK);
        if (SELF_HARM.matcher(message).find()) found.add(Danger.SELF_HARM);
        return found;
    }

    static String safetyBlock(Set<Danger> dangers) {
        List<String> parts = new ArrayList<>();
        if (dangers.contains(Danger.SELF_HARM)) {
            parts.add("I am sorry you are going through this. You do not have to face it alone. "
                    + "If you might act on these thoughts, call 999 or 112 or go to the nearest health "
                    + "facility now, and tell someone you trust.");
        }
        if (dangers.contains(Danger.IMMEDIATE_DANGER)) {
            parts.add("If you are in danger right now, get to a safe place and call the police on 999 or 112. "
                    + "If you can, tell someone you trust where you are.");
        }
        if (dangers.contains(Danger.CHILD_AT_RISK)) {
            parts.add("If a child is being hurt or is at risk, call the police on 999 or 112 and the "
                    + "Uganda Child Helpline on 116.");
        }
        return String.join("\n\n", parts);
    }

    /** One line per distinct source: document, section and page where known. */
    static String sourceFooter(List<LegalSourceReference> sources) {
        Set<String> lines = new LinkedHashSet<>();
        for (LegalSourceReference s : sources) {
            StringBuilder sb = new StringBuilder();
            String title = s.getDocumentTitle();
            sb.append(title == null || title.isBlank() ? "Legal knowledge base" : title.trim());
            if (s.getLegalSection() != null && !s.getLegalSection().isBlank()) {
                sb.append(", ").append(s.getLegalSection().trim());
            }
            if (s.getPageNumber() != null) {
                sb.append(", page ").append(s.getPageNumber());
            }
            lines.add(sb.toString());
        }
        if (lines.isEmpty()) return "";
        return "Sources used:\n- " + String.join("\n- ", lines);
    }

    /**
     * @param modelReply the model's answer, or null if there was none
     * @param sources the sources the answer was grounded on (empty when none were used)
     * @param dangers what detectDanger found in the person's message
     * @return the final reply, or null when there is nothing to show (the caller shows its own fallback)
     */
    public static String compose(String modelReply, List<LegalSourceReference> sources, Set<Danger> dangers) {
        String reply = modelReply == null ? "" : modelReply.trim();

        if (!reply.isEmpty() && sources != null && !sources.isEmpty()) {
            reply = reply + "\n\n" + sourceFooter(sources);
            if (!reply.toLowerCase(Locale.ROOT).contains("not legal advice")) {
                reply = reply + "\n\n" + DISCLAIMER;
            }
        }

        if (dangers != null && !dangers.isEmpty()) {
            String block = safetyBlock(dangers);
            reply = reply.isEmpty() ? block : block + "\n\n" + reply;
        }
        return reply.isEmpty() ? null : reply;
    }
}
