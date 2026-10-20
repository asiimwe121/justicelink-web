package lcdjp.cases;

import lcdjp.security.FieldCrypto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CaseRowsTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @AfterEach
    void clear() {
        System.clearProperty("app.field-encryption-key");
    }

    @Test
    void protectionNarrativeIsSealedAndOpensAgain() {
        System.setProperty("app.field-encryption-key", KEY);
        String sealed = CaseRows.seal("PROTECTION", "My neighbour beats his child");
        assertTrue(sealed.startsWith("enc:v1:"));
        assertFalse(sealed.contains("neighbour"));

        Map<String, Object> row = new HashMap<>();
        row.put("case_reference", "C-1");
        row.put("description", sealed);
        row.put("extra_notes", CaseRows.seal("PROTECTION", "She is 9"));
        row.put("case_details", FieldCrypto.encrypt("{\"k\":\"v\"}"));
        CaseRows.open(row);

        assertEquals("My neighbour beats his child", row.get("description"));
        assertEquals("She is 9", row.get("extra_notes"));
        assertEquals("{\"k\":\"v\"}", row.get("case_details"));
        assertNull(row.get(CaseRows.UNAVAILABLE_FLAG));
    }

    @Test
    void otherTracksAreNotSealed() {
        System.setProperty("app.field-encryption-key", KEY);
        assertEquals("plain", CaseRows.seal("LC_MEDIATION", "plain"));
        assertEquals("plain", CaseRows.seal(null, "plain"));
        assertNull(CaseRows.seal("PROTECTION", null));
    }

    @Test
    void legacyPlaintextRowsStillRead() {
        Map<String, Object> row = new HashMap<>();
        row.put("description", "old plain row");
        CaseRows.open(row);
        assertEquals("old plain row", row.get("description"));
    }

    @Test
    void wrongOrMissingKeyNeverLeaksCiphertext() {
        System.setProperty("app.field-encryption-key", KEY);
        String sealed = CaseRows.seal("PROTECTION", "secret");
        System.clearProperty("app.field-encryption-key");

        Map<String, Object> row = new HashMap<>();
        row.put("case_reference", "C-2");
        row.put("description", sealed);
        CaseRows.open(row);

        assertNull(row.get("description"));
        assertEquals(Boolean.TRUE, row.get(CaseRows.UNAVAILABLE_FLAG));
    }

    @Test
    void opensWholeLists() {
        System.setProperty("app.field-encryption-key", KEY);
        Map<String, Object> a = new HashMap<>();
        a.put("description", CaseRows.seal("PROTECTION", "one"));
        List<Map<String, Object>> rows = List.of(a);
        CaseRows.open(rows);
        assertEquals("one", a.get("description"));
    }
}
