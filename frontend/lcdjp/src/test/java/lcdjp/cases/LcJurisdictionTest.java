package lcdjp.cases;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class LcJurisdictionTest {

    private static Map<String, Object> lc(String level, String village, String parish, String subCounty, String district) {
        Map<String, Object> m = new HashMap<>();
        m.put("lc_level", level);
        m.put("village", village);
        m.put("parish", parish);
        m.put("sub_county", subCounty);
        m.put("district", district);
        return m;
    }

    private static Map<String, String> area(String village, String parish, String subCounty, String district) {
        Map<String, String> m = new HashMap<>();
        m.put("village", village);
        m.put("parish", parish);
        m.put("subCounty", subCounty);
        m.put("district", district);
        return m;
    }

    private final Map<String, String> citizen = area("Kasubi", "Lubaga", "Rubaga", "Kampala");

    @Test
    void lc1_matchesOnlyTheCitizensOwnVillage() {
        assertTrue(LcJurisdiction.covers(lc("LC1", "Kasubi", "Lubaga", "Rubaga", "Kampala"), "LC1", citizen));
        assertTrue(LcJurisdiction.covers(lc("LC1", " kasubi ", "LUBAGA", "rubaga", "kampala"), "LC1", citizen));
        assertFalse(LcJurisdiction.covers(lc("LC1", "Nsambya", "Lubaga", "Rubaga", "Kampala"), "LC1", citizen));
    }

    @Test
    void sameVillageNameInAnotherParishOrDistrictIsNotMatched() {
        assertFalse(LcJurisdiction.covers(lc("LC1", "Kasubi", "Nakulabye", "Rubaga", "Kampala"), "LC1", citizen));
        assertFalse(LcJurisdiction.covers(lc("LC1", "Kasubi", "Lubaga", "Rubaga", "Wakiso"), "LC1", citizen));
    }

    @Test
    void lc2AndLc3_matchTheirOwnParishAndSubCountyOnly() {
        assertTrue(LcJurisdiction.covers(lc("LC2", null, "Lubaga", "Rubaga", "Kampala"), "LC2", citizen));
        assertFalse(LcJurisdiction.covers(lc("LC2", null, "Nakulabye", "Rubaga", "Kampala"), "LC2", citizen));
        assertTrue(LcJurisdiction.covers(lc("LC3", null, null, "Rubaga", "Kampala"), "LC3", citizen));
        assertFalse(LcJurisdiction.covers(lc("LC3", null, null, "Makindye", "Kampala"), "LC3", citizen));
    }

    @Test
    void anOfficialOfAnotherLevelIsNotReturnedForTheRequestedLevel() {
        assertFalse(LcJurisdiction.covers(lc("LC2", null, "Lubaga", "Rubaga", "Kampala"), "LC1", citizen));
    }

    @Test
    void missingPartOfTheCitizensAddressMatchesNobody() {
        assertFalse(LcJurisdiction.covers(lc("LC1", "Kasubi", "Lubaga", "Rubaga", "Kampala"), "LC1",
                area("Kasubi", null, "Rubaga", "Kampala")));
    }

    @Test
    void lc4AndLc5AreNeverMatched() {
        assertFalse(LcJurisdiction.covers(lc("LC4", null, null, null, "Kampala"), "LC4", citizen));
        assertFalse(LcJurisdiction.covers(lc("LC5", null, null, null, "Kampala"), "LC5", citizen));
    }

    @Test
    void levelIsReadFromTextOrInferredFromTheLowestAreaFilledIn() {
        assertEquals("LC1", LcJurisdiction.normalizeLevel("Village", null, null, null));
        assertEquals("LC2", LcJurisdiction.normalizeLevel("LC 2", null, null, null));
        assertEquals("LC3", LcJurisdiction.normalizeLevel("Sub-county", null, null, null));
        assertEquals("LC4", LcJurisdiction.normalizeLevel("County", null, null, null));
        assertEquals("LC5", LcJurisdiction.normalizeLevel("District", null, null, null));
        assertEquals("LC1", LcJurisdiction.normalizeLevel("", "V", "P", "S"));
        assertEquals("LC2", LcJurisdiction.normalizeLevel(null, "", "P", "S"));
        assertEquals("LC3", LcJurisdiction.normalizeLevel(null, null, null, "S"));
        assertNull(LcJurisdiction.normalizeLevel(null, null, null, null));
    }

    @Test
    void filterCoveringKeepsOnlyOfficialsWhoServeTheArea() {
        List<Map<String, Object>> rows = List.of(
                lc("LC1", "Kasubi", "Lubaga", "Rubaga", "Kampala"),
                lc("LC1", "Nsambya", "Lubaga", "Rubaga", "Kampala"),
                lc("LC2", null, "Lubaga", "Rubaga", "Kampala"));
        assertEquals(1, LcJurisdiction.filterCovering(rows, "LC1", citizen).size());
    }
}
