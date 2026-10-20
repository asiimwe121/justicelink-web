package lcdjp.cases;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JurisdictionRoutingTest {

    private JurisdictionRouting.Track track(String type, String description) {
        return JurisdictionRouting.assess(type, description).track;
    }

    @Test
    void domesticViolence_goesToProtection_notLcQueue() {
        JurisdictionRouting.Assessment a = JurisdictionRouting.assess("Family Dispute", "My husband beats me every night");
        assertEquals(JurisdictionRouting.Track.PROTECTION, a.track);
        assertTrue(a.isUrgent());
        assertFalse(a.isLcEligible());
        assertFalse(a.contacts.isEmpty());
    }

    @Test
    void defilement_goesToProtection() {
        assertEquals(JurisdictionRouting.Track.PROTECTION, track("Others", "A man defiled my daughter"));
    }

    @Test
    void rapeAndMurder_areSeriousCrime() {
        assertEquals(JurisdictionRouting.Track.CRIMINAL_SERIOUS, track("Others", "She was raped last week"));
        assertEquals(JurisdictionRouting.Track.CRIMINAL_SERIOUS, track("Others", "They committed murder in our village"));
    }

    @Test
    void arrest_goesToDetention_andOutranksLand() {
        assertEquals(JurisdictionRouting.Track.DETENTION, track("Others", "My brother was arrested and is at the police station"));
        assertEquals(JurisdictionRouting.Track.DETENTION, track("Land Matter", "He was arrested over a land dispute"));
    }

    @Test
    void landDispute_staysLcEligible() {
        JurisdictionRouting.Assessment a = JurisdictionRouting.assess("Land Matter", "My neighbour moved the boundary of our plot");
        assertEquals(JurisdictionRouting.Track.LAND, a.track);
        assertTrue(a.isLcEligible());
        assertFalse(a.isUrgent());
    }

    @Test
    void mobileMoneyFraud_andEmployment_areNotLcEligible() {
        assertEquals(JurisdictionRouting.Track.FRAUD, track("Others", "Someone took money from my mobile money account"));
        assertFalse(JurisdictionRouting.assess("Others", "Someone took money from my mobile money account").isLcEligible());
        assertEquals(JurisdictionRouting.Track.EMPLOYMENT, track("Business Matter", "My employer has not paid my salary"));
    }

    @Test
    void everydayNeighbourDispute_staysInLcMediation() {
        assertEquals(JurisdictionRouting.Track.LC_MEDIATION, track("Community Disputes", "The neighbour's goats eat my bananas"));
        assertEquals(JurisdictionRouting.Track.LC_MEDIATION, track("Community Disputes", "He killed my goat"));
    }

    @Test
    void nullInputs_defaultToLcMediation() {
        assertEquals(JurisdictionRouting.Track.LC_MEDIATION, track(null, null));
    }

    @Test
    void caseDetails_keepsOnlyWhitelistedKeys_andEscapesJson() {
        String json = CaseDetails.sanitizeToJson(JurisdictionRouting.Track.LAND,
                Map.of("plotLocation", "Plot \"7\", Kira", "evil", "x", "witnesses", "  "));
        assertEquals("{\"plotLocation\":\"Plot \\\"7\\\", Kira\"}", json);
        assertNull(CaseDetails.sanitizeToJson(JurisdictionRouting.Track.LC_MEDIATION, Map.of("plotLocation", "x")));
        assertNull(CaseDetails.sanitizeToJson(JurisdictionRouting.Track.LAND, null));
    }
}
