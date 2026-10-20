package lcdjp.cases;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CoverageGapServiceTest {

    @Test
    void messageNamesLevelAreaAndDistrict_butNoCaseContent() {
        String m = CoverageGapService.message("LCDJP-1", "LC2", "Laroo, Pece", "Gulu");
        assertTrue(m.contains("LCDJP-1"));
        assertTrue(m.contains("LC2"));
        assertTrue(m.contains("Laroo, Pece"));
        assertTrue(m.contains("(Gulu)"));
    }

    @Test
    void messageToleratesMissingArea() {
        String m = CoverageGapService.message("LCDJP-2", "LC3", "", null);
        assertFalse(m.contains("for  "));
        assertEquals("Case LCDJP-2 has no registered LC3 office. Please register an LC for this area or suggest an LC, lawyer, police station or court for the case.", m);
    }
}
