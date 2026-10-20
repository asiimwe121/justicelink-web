package lcdjp.cases;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Decides whether a registered LC official covers a given area. Each village has its own LC1, each parish its
 * own LC2 and each sub-county its own LC3, so an official only covers the area whose whole chain matches:
 *
 * <pre>
 *   LC1  village + parish + sub-county + district
 *   LC2           parish + sub-county + district
 *   LC3                    sub-county + district
 * </pre>
 *
 * Names such as "Kasubi" or "Central" repeat across parishes and districts, so a village or parish name is never
 * matched on its own. If the citizen's address is missing a part of the chain the official's area cannot be
 * verified and nobody matches (the caller then reports a coverage gap instead of guessing).
 *
 * LC4 (county/municipal) and LC5 (district/city) are recognised so they are never mistaken for a lower level,
 * but they are administrative councils rather than dispute venues and are never matched here.
 */
public final class LcJurisdiction {

    private LcJurisdiction() {}

    /** Levels a citizen can be sent to, lowest first. */
    public static final List<String> DISPUTE_LEVELS = List.of("LC1", "LC2", "LC3");

    /** The area fields that must all match for a level, e.g. LC2 needs parish, subCounty and district. */
    public static List<String> chainFor(String level) {
        if (level == null) return List.of();
        return switch (level) {
            case "LC1" -> List.of("village", "parish", "subCounty", "district");
            case "LC2" -> List.of("parish", "subCounty", "district");
            case "LC3" -> List.of("subCounty", "district");
            default -> List.of();
        };
    }

    /**
     * Turns the stored lc_level text ("LC1", "LC 2", "Parish", "Sub-county (LC3)", ...) into LC1..LC5.
     * When the text is blank or unrecognised the level is inferred from the lowest area the official filled in.
     * Returns null when nothing can be worked out.
     */
    public static String normalizeLevel(String lcLevel, String village, String parish, String subCounty) {
        String t = lcLevel == null ? "" : lcLevel.toLowerCase(Locale.ROOT).trim();
        if (!t.isEmpty()) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("lc\\s*-?\\s*([1-5])").matcher(t);
            if (m.find()) return "LC" + m.group(1);
            if (t.contains("sub-county") || t.contains("sub county") || t.contains("subcounty")
                    || t.contains("town council")) return "LC3";
            if (t.contains("parish")) return "LC2";
            if (t.contains("village") || t.contains("cell") || t.contains("ward")) return "LC1";
            if (t.contains("county") || t.contains("municipal") || t.contains("division")) return "LC4";
            if (t.contains("district") || t.contains("city")) return "LC5";
            if (t.matches("[1-5]")) return "LC" + t;
        }
        if (!blank(village)) return "LC1";
        if (!blank(parish)) return "LC2";
        if (!blank(subCounty)) return "LC3";
        return null;
    }

    /** Level of a users-table row (columns lc_level, village, parish, sub_county). */
    public static String levelOfUserRow(Map<String, Object> row) {
        return normalizeLevel(str(row.get("lc_level")), str(row.get("village")),
                str(row.get("parish")), str(row.get("sub_county")));
    }

    /**
     * True when this official, at their own level, covers the area. Area keys: village, parish, subCounty, district.
     */
    public static boolean covers(Map<String, Object> lcUserRow, Map<String, String> area) {
        return covers(lcUserRow, levelOfUserRow(lcUserRow), area);
    }

    /** True when this official covers the area at the given level (the level a citizen is asking for). */
    public static boolean covers(Map<String, Object> lcUserRow, String level, Map<String, String> area) {
        if (lcUserRow == null || area == null) return false;
        List<String> chain = chainFor(level);
        if (chain.isEmpty()) return false;
        if (!level.equals(levelOfUserRow(lcUserRow))) return false;
        for (String key : chain) {
            String wanted = normalizeName(area.get(key));
            String have = normalizeName(str(lcUserRow.get(columnFor(key))));
            if (wanted.isEmpty() || have.isEmpty() || !wanted.equals(have)) return false;
        }
        return true;
    }

    /** Keeps only the officials who cover the area at the given level, in their original order. */
    public static List<Map<String, Object>> filterCovering(List<Map<String, Object>> lcUserRows, String level,
                                                           Map<String, String> area) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (lcUserRows == null) return out;
        for (Map<String, Object> row : lcUserRows) {
            if (covers(row, level, area)) out.add(row);
        }
        return out;
    }

    private static String columnFor(String areaKey) {
        return "subCounty".equals(areaKey) ? "sub_county" : areaKey;
    }

    /** Case-insensitive, trimmed, with repeated spaces collapsed. */
    static String normalizeName(String s) {
        return s == null ? "" : s.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }

    private static String str(Object o) { return o == null ? "" : o.toString(); }
}
