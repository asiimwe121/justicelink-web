package lcdjp.lcinvite;

import lcdjp.admin.LcLevelRules;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LcLevelRulesTest {

    @Test
    void levelIsNormalisedOrRejected() {
        assertEquals("LC3", LcLevelRules.normalizeLevel("lc 3"));
        assertEquals("LC1", LcLevelRules.normalizeLevel(" LC-1 "));
        assertNull(LcLevelRules.normalizeLevel("LC6"));
        assertNull(LcLevelRules.normalizeLevel(null));
    }

    @Test
    void eachLevelNeedsItsOwnAreas() {
        assertEquals("village", LcLevelRules.missingArea("LC1", "", "P", "S"));
        assertEquals("parish", LcLevelRules.missingArea("LC2", "", "", "S"));
        assertEquals("sub-county", LcLevelRules.missingArea("LC3", "", "", ""));
        assertNull(LcLevelRules.missingArea("LC4", "", "", ""));
        assertNull(LcLevelRules.missingArea("LC5", "", "", ""));
    }

    @Test
    void areasBelowTheLevelAreNotUsed() {
        assertTrue(LcLevelRules.usesVillage("LC1"));
        assertFalse(LcLevelRules.usesVillage("LC2"));
        assertTrue(LcLevelRules.usesParish("LC2"));
        assertFalse(LcLevelRules.usesParish("LC3"));
        assertTrue(LcLevelRules.usesSubCounty("LC3"));
        assertFalse(LcLevelRules.usesSubCounty("LC4"));
    }
}
