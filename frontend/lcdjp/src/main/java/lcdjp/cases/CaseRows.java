package lcdjp.cases;

import lcdjp.security.FieldCrypto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Read path for encrypted case columns. Every case row that leaves the server goes through
 * {@link #open(Map)} so clients never see "enc:v1:..." ciphertext, and a missing or wrong key degrades
 * to "details unavailable" instead of a 500 that hides the whole case.
 */
public final class CaseRows {

    private static final Logger logger = LoggerFactory.getLogger(CaseRows.class);
    static final String DETAILS_COLUMN = "case_details";
    static final String UNAVAILABLE_FLAG = "case_details_unavailable";

    /** Tracks whose free-text narrative (what happened, to whom) is stored encrypted. */
    static final Set<String> PROTECTED_TRACKS = Set.of("PROTECTION");
    /** Free-text columns sealed for protected tracks, in addition to case_details. */
    static final List<String> NARRATIVE_COLUMNS = List.of("description", "extra_notes");

    private CaseRows() {
    }

    public static boolean isProtectedTrack(String track) {
        return track != null && PROTECTED_TRACKS.contains(track.toUpperCase());
    }

    /** Encrypts free text for protected tracks; other tracks (and null/blank text) pass through unchanged. */
    public static String seal(String track, String text) {
        if (text == null || text.isBlank() || !isProtectedTrack(track)) return text;
        return FieldCrypto.encrypt(text);
    }

    /** Decrypts the encrypted columns in place and returns the same row. Null-safe. */
    public static Map<String, Object> open(Map<String, Object> row) {
        if (row == null) return null;
        boolean failed = openColumn(row, DETAILS_COLUMN);
        for (String column : NARRATIVE_COLUMNS) {
            failed |= openColumn(row, column);
        }
        if (failed) row.put(UNAVAILABLE_FLAG, Boolean.TRUE);
        return row;
    }

    private static boolean openColumn(Map<String, Object> row, String column) {
        Object raw = row.get(column);
        if (raw == null) return false;
        try {
            row.put(column, FieldCrypto.decrypt(raw.toString()));
            return false;
        } catch (RuntimeException e) {
            // Never fall back to returning the ciphertext, and never log the value itself.
            logger.error("Could not decrypt {} for case {}: {}", column, row.get("case_reference"), e.getMessage());
            row.put(column, null);
            return true;
        }
    }

    public static List<Map<String, Object>> open(List<Map<String, Object>> rows) {
        if (rows != null) rows.forEach(CaseRows::open);
        return rows;
    }
}
