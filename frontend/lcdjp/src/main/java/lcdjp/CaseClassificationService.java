package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CaseClassificationService {

    private static final Logger log = LoggerFactory.getLogger(CaseClassificationService.class);

    static final List<String> KNOWN_CASE_TYPES = List.of(
            "Family Dispute", "Land Matter", "Business Matter", "Community Disputes",
            "Inheritance Dispute", "Boundary Dispute", "Marriage Dispute", "Child Custody",
            "Debt Recovery", "Others"
    );

    private static final String FALLBACK_TYPE = "Others";

    private static final Pattern CATEGORY_LINE = Pattern.compile("(?im)^\\s*CATEGORY:\\s*(.+)$");
    private static final Pattern EXPLANATION_LINE = Pattern.compile("(?im)^\\s*EXPLANATION:\\s*(.+)$", Pattern.DOTALL);

    private final AiOrchestratorService orchestratorService;

    public CaseClassificationService(AiOrchestratorService orchestratorService) {
        this.orchestratorService = orchestratorService;
    }

    public static class Result {
        public String suggestedCaseType;
        public String explanation;
        public boolean legalRagUsed;
        public List<LegalSourceReference> sources;
    }

    public Result classify(String description, String district) {
        Result result = new Result();

        if (description == null || description.isBlank()) {
            result.suggestedCaseType = FALLBACK_TYPE;
            result.explanation = "No description was provided, so no classification could be suggested.";
            result.legalRagUsed = false;
            result.sources = List.of();
            return result;
        }

        AiChatRequest request = new AiChatRequest();
        request.setMessage(description);
        request.setContext(buildClassificationPrompt(district));
        request.setCategory("Case Classification");
        request.setSessionId("case-classification");

        AiOrchestratorService.Outcome outcome = orchestratorService.handle(request, true);

        result.legalRagUsed = outcome.legalRagUsed;
        result.sources = outcome.sources;

        if (outcome.reply == null || outcome.reply.isBlank()) {
            result.suggestedCaseType = FALLBACK_TYPE;
            result.explanation = "Automatic classification is unavailable right now — please choose the "
                    + "category that best matches your situation.";
            return result;
        }

        parseInto(outcome.reply, result);
        return result;
    }

    private String buildClassificationPrompt(String district) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are helping classify a citizen's Report Case submission for JusticeLink (LCDJP), ")
          .append("a Ugandan digital justice platform. Read the citizen's description below and identify ")
          .append("the general nature of their situation using the verified legal material provided.\n\n");

        sb.append("You must choose exactly ONE category from this fixed list — never invent a new one, ")
          .append("and never combine several:\n");
        for (String type : KNOWN_CASE_TYPES) {
            sb.append("- ").append(type).append("\n");
        }

        sb.append("\nYou are choosing a general category only. You must NOT name, recommend, or imply any ")
          .append("specific police station, LC office, lawyer, or organisation — institutional routing is ")
          .append("decided separately by JusticeLink's own rules, never by you.\n");

        if (district != null && !district.isBlank()) {
            sb.append("\nThe citizen's district (for general context only, not for choosing an institution): ")
              .append(district).append("\n");
        }

        sb.append("\nRespond in EXACTLY this format, nothing else:\n")
          .append("CATEGORY: <one of the exact category names above>\n")
          .append("EXPLANATION: <2-3 plain-language sentences for the citizen, grounded in the legal material ")
          .append("when it is relevant, explaining why this category fits and, where the retrieved material ")
          .append("supports it, what the law generally says about this kind of situation>");

        return sb.toString();
    }

    private void parseInto(String reply, Result result) {
        Matcher catMatcher = CATEGORY_LINE.matcher(reply);
        String rawCategory = catMatcher.find() ? catMatcher.group(1).trim() : null;

        Matcher explMatcher = EXPLANATION_LINE.matcher(reply);
        String explanation = explMatcher.find() ? explMatcher.group(1).trim() : reply.trim();

        result.suggestedCaseType = resolveKnownType(rawCategory);
        result.explanation = explanation;

        if (rawCategory == null) {
            log.info("[CaseClassification] Reply had no parseable CATEGORY line; defaulting to '{}'", FALLBACK_TYPE);
        } else if (!result.suggestedCaseType.equalsIgnoreCase(rawCategory)) {
            log.info("[CaseClassification] Model returned unrecognised category '{}'; defaulting to '{}'",
                    rawCategory, FALLBACK_TYPE);
        }
    }

    private String resolveKnownType(String raw) {
        if (raw == null || raw.isBlank()) return FALLBACK_TYPE;
        String normalized = raw.trim().toLowerCase();
        for (String known : KNOWN_CASE_TYPES) {
            if (normalized.equals(known.toLowerCase()) || normalized.contains(known.toLowerCase())) {
                return known;
            }
        }
        return FALLBACK_TYPE;
    }

    static Set<String> knownTypesLowercase() {
        Set<String> set = new LinkedHashSet<>();
        for (String t : KNOWN_CASE_TYPES) set.add(t.toLowerCase());
        return set;
    }
}
