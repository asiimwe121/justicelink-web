package lcdjp.legal;

import lcdjp.common.OutboundHttp;
import lcdjp.translation.TranslationService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GlossaryServiceTest {

    private static final String JSON = """
        {"terms":[
          {"en":"Bail","translations":{
            "lug":{"text":"REVIEWED-LUG","reviewed":true},
            "ach":{"text":"DRAFT-ACH","reviewed":false},
            "teo":{"text":"","reviewed":true}}},
          {"en":"Legal   Aid","translations":{"lug":{"text":"REVIEWED-AID","reviewed":true}}}
        ]}""";

    @Test
    void appliesOnlyReviewedNonEmptyEntries() {
        GlossaryService g = new GlossaryService(JSON, true);
        assertEquals("REVIEWED-LUG", g.lookup("Bail", "lug").orElseThrow());
        assertTrue(g.lookup("Bail", "ach").isEmpty());
        assertTrue(g.lookup("Bail", "teo").isEmpty());
        assertTrue(g.lookup("Bail", "nyn").isEmpty());
        assertEquals(2, g.unreviewedSlots());
    }

    @Test
    void matchIgnoresCaseAndWhitespace() {
        GlossaryService g = new GlossaryService(JSON, true);
        assertEquals("REVIEWED-AID", g.lookup("  legal aid ", "lug").orElseThrow());
        assertTrue(g.lookup("legal aid centre", "lug").isEmpty());
    }

    @Test
    void shippedGlossaryLoadsAndHasNothingAppliedUntilReviewed() {
        GlossaryService g = new GlossaryService("");
        assertTrue(g.lookup("Bail", "lug").isEmpty());
        assertTrue(g.unreviewedSlots() > 0);
    }

    @Test
    void translationServiceUsesGlossaryEvenWithoutApiToken() {
        TranslationService ts = new TranslationService(
                org.mockito.Mockito.mock(OutboundHttp.class), "", "http://unused", true, 100, 1, 1);
        ts.setGlossary(new GlossaryService(JSON, true));
        List<String> out = ts.translate(List.of("Bail", "Something else"), "lug");
        assertEquals("REVIEWED-LUG", out.get(0));
        assertNull(out.get(1));
    }
}
