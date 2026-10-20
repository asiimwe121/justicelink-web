package lcdjp.legal;

import lcdjp.ai.AiChatRequest;
import lcdjp.ai.AiChatTurn;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class LegalIntentDetector {

    private static final List<String> LEGAL_CONTEXT_MARKERS = List.of(
            "legal aid", "legal help", "legal guidance", "legal terms",
            "know your rights", "understand my case", "legal templates",
            "legal knowledge", "find a lawyer", "legal organization",
            "justicelink legal aid assistant", "mediation & dispute resolution"
    );

    private static final List<String> LEGAL_CATEGORY_LABELS = List.of(
            "family dispute", "land matter", "business matter",
            "community disputes", "inheritance dispute", "boundary dispute",
            "marriage dispute", "child custody", "debt recovery",
            "know your rights", "common legal questions", "ai legal guidance",
            "legal templates", "legal aid providers", "land & property law",
            "family & marriage law", "business & employment law",
            "community disputes (lc)", "mediation & dispute resolution"
    );

    private static final Pattern LEGAL_KEYWORD_PATTERN = Pattern.compile(
            "\\b(my rights|legal rights?|landlord|evict|tenant|inherit|inheritance|" +
            "succession|custody|child support|alimony|divorce|\\bsue\\b|lawsuit|" +
            "constitution|penal code|penalty|arrested|\\bbail\\b|lawyer|advocate|" +
            "attorney|\\bcourt\\b|magistrate|tribunal|local council|\\bthe lc\\b|" +
            "land title|land dispute|boundary|trespass|domestic violence|" +
            "marriage act|breach of contract|what does the law|is it legal|" +
            "is it illegal|what law|which law|legal requirement|legal procedure|" +
            "file a case|press charges|report this to|my legal|children act|" +
            "succession act|land act|law development centre|\\bldc\\b|" +
            "justice law and order sector|\\bjlos\\b|judiciary|" +
            "director(?:ate)? of public prosecutions|\\bdpp\\b|" +
            "uganda law society|\\buls\\b|bar association|law(?:yers)? association|" +
            "\\bundp\\b|\\bunhcr\\b|human rights organi[sz]ation|" +
            "legal aid ngo|law firm|advocates? (?:llp|llb|&|and))\\b",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * How strongly a request points at the legal knowledge base.
     * STRONG: explicit legal context, a legal category, or a legal keyword (original behaviour). The answer is
     *         grounded in retrieved material and says so if nothing relevant was found.
     * WEAK:   the person is simply asking a real question (or continuing a legal conversation) with no keyword.
     *         Retrieval is attempted, but if nothing relevant comes back the model just answers normally.
     * NONE:   no retrieval.
     */
    public enum Signal { NONE, WEAK, STRONG }

    private static final Pattern QUESTION_START = Pattern.compile(
            "^(what|whats|why|how|when|where|who|which|can|could|should|shall|do|does|did|is|are|am|will|would|may|must|have|has)\\b",
            Pattern.CASE_INSENSITIVE);

    // Incident categories where the conversation is about getting urgent help, not legal research; keep those
    // fast and only retrieve legal material when a strong signal is present.
    private static final List<String> URGENT_CATEGORY_MARKERS = List.of(
            "emergency", "accident", "missing person", "road incident", "vehicle breakdown"
    );

    public boolean requiresLegalKnowledge(AiChatRequest request) {
        return legalSignal(request) != Signal.NONE;
    }

    public Signal legalSignal(AiChatRequest request) {
        if (request == null) return Signal.NONE;

        if (request.isDisguise()) return Signal.NONE;

        String message = safe(request.getMessage());
        if ("start_chat_greeting".equals(message)) return Signal.NONE;

        String contextLower = safe(request.getContext()).toLowerCase(Locale.ROOT);
        for (String marker : LEGAL_CONTEXT_MARKERS) {
            if (contextLower.contains(marker)) return Signal.STRONG;
        }

        String categoryLower = safe(request.getCategory()).toLowerCase(Locale.ROOT);
        for (String label : LEGAL_CATEGORY_LABELS) {
            if (categoryLower.contains(label)) return Signal.STRONG;
        }

        if (LEGAL_KEYWORD_PATTERN.matcher(message).find()) return Signal.STRONG;

        for (String urgent : URGENT_CATEGORY_MARKERS) {
            if (categoryLower.contains(urgent)) return Signal.NONE;
        }

        // A follow-up inside a conversation that already touched on legal topics ("and how long does that take?")
        for (AiChatTurn turn : request.getHistory()) {
            if ("user".equals(turn.getRole()) && LEGAL_KEYWORD_PATTERN.matcher(turn.getContent()).find()) {
                return Signal.WEAK;
            }
        }

        return looksLikeQuestion(message) ? Signal.WEAK : Signal.NONE;
    }

    /** True for a real question (contains '?' or starts with an interrogative/auxiliary) of at least 4 words. */
    public static boolean looksLikeQuestion(String message) {
        if (message == null) return false;
        String m = message.trim();
        if (m.split("\\s+").length < 4) return false;
        return m.contains("?") || QUESTION_START.matcher(m).find();
    }

    /**
     * True when the message is a real question or contains a legal keyword, as opposed to a greeting or
     * small talk that merely arrived in a legal-looking context.
     */
    public static boolean isSubstantiveLegalMessage(String message) {
        if (message == null || message.isBlank()) return false;
        return looksLikeQuestion(message) || LEGAL_KEYWORD_PATTERN.matcher(message).find();
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}
