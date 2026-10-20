package lcdjp.cases;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Structured extra details collected for specific kinds of reports (land plots, detentions).
 * Only whitelisted keys are kept, values are trimmed and length-capped, and the result is stored as a
 * small JSON object in cases.case_details. Anything else a client sends is dropped.
 */
public final class CaseDetails {

    private CaseDetails() {}

    static final int MAX_VALUE_LENGTH = 300;

    private static final Map<JurisdictionRouting.Track, List<String>> ALLOWED_KEYS = Map.of(
            JurisdictionRouting.Track.LAND, List.of(
                    "plotLocation", "tenureType", "hasTitleOrAgreement", "otherPartyName",
                    "witnesses", "disputeStartedWhen"),
            JurisdictionRouting.Track.DETENTION, List.of(
                    "detaineeName", "whereHeld", "detainedWhen", "chargeTold", "contactForDetainee"));

    /** @return a JSON object string, or null when there is nothing to store for this track. */
    public static String sanitizeToJson(JurisdictionRouting.Track track, Map<String, ?> raw) {
        List<String> allowed = ALLOWED_KEYS.get(track);
        if (allowed == null || raw == null || raw.isEmpty()) return null;

        Map<String, String> kept = new LinkedHashMap<>();
        for (String key : allowed) {
            Object value = raw.get(key);
            if (value == null) continue;
            String text = value.toString().trim();
            if (text.isEmpty()) continue;
            kept.put(key, text.length() > MAX_VALUE_LENGTH ? text.substring(0, MAX_VALUE_LENGTH) : text);
        }
        if (kept.isEmpty()) return null;

        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, String> e : kept.entrySet()) {
            parts.add("\"" + e.getKey() + "\":\"" + escape(e.getValue()) + "\"");
        }
        return "{" + String.join(",", parts) + "}";
    }

    private static String escape(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.toString();
    }
}
