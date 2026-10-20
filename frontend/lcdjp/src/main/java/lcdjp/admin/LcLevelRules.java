package lcdjp.admin;

/**
 * The rules for which LC level needs which areas. One home for them so the admin form
 * ({@link LcController}) and the invite-link sign-up page can't drift apart.
 */
public final class LcLevelRules {

    private LcLevelRules() {
    }

    /** "lc 3", "LC3", "lc-3" -> "LC3"; null when it is not LC1..LC5. */
    public static String normalizeLevel(String raw) {
        if (raw == null) return null;
        String t = raw.trim().toUpperCase().replaceAll("[\\s-]", "");
        return t.matches("LC[1-5]") ? t : null;
    }

    /** Name of the first area the level needs but was left blank, or null when nothing is missing. */
    public static String missingArea(String level, String village, String parish, String subCounty) {
        switch (level) {
            case "LC1": if (village.isEmpty()) return "village"; if (parish.isEmpty()) return "parish"; return subCounty.isEmpty() ? "sub-county" : null;
            case "LC2": if (parish.isEmpty()) return "parish"; return subCounty.isEmpty() ? "sub-county" : null;
            case "LC3": return subCounty.isEmpty() ? "sub-county" : null;
            default:    return null; // LC4 (county / municipality) and LC5 (district) are identified by the district
        }
    }

    /** An LC3 has no village, an LC4 has no parish, and so on: areas below the level are not stored. */
    public static boolean usesVillage(String level) {
        return "LC1".equals(level);
    }

    public static boolean usesParish(String level) {
        return "LC1".equals(level) || "LC2".equals(level);
    }

    public static boolean usesSubCounty(String level) {
        return "LC1".equals(level) || "LC2".equals(level) || "LC3".equals(level);
    }
}
