package lcdjp.chat;

import lcdjp.legal.LegalSourceReference;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ChatReplyPolicyTest {

    private static final List<LegalSourceReference> SOURCES = List.of(
            new LegalSourceReference("Land Act", "Section 29", 12, "a"),
            new LegalSourceReference("Land Act", "Section 29", 12, "b"));

    @Test
    void groundedAnswer_endsWithDistinctSourcesAndDisclaimer() {
        String reply = ChatReplyPolicy.compose("A tenant has rights.", SOURCES, Set.of());
        assertTrue(reply.contains("Sources used:\n- Land Act, Section 29, page 12"));
        assertEquals(reply.indexOf("Land Act"), reply.lastIndexOf("Land Act"));
        assertTrue(reply.contains("not legal advice"));
    }

    @Test
    void disclaimerIsNotDuplicated() {
        String reply = ChatReplyPolicy.compose("Answer. This is not legal advice.", SOURCES, Set.of());
        assertEquals(2, reply.split("not legal advice", -1).length);
    }

    @Test
    void noSources_noFooter() {
        assertFalse(ChatReplyPolicy.compose("Hello!", List.of(), Set.of()).contains("Sources used"));
    }

    @Test
    void danger_putsEmergencyNumbersFirst() {
        String reply = ChatReplyPolicy.compose("Some legal text.", List.of(),
                EnumSet.of(ChatReplyPolicy.Danger.IMMEDIATE_DANGER));
        assertTrue(reply.startsWith("If you are in danger right now"));
        assertTrue(reply.contains("999"));
        assertTrue(reply.endsWith("Some legal text."));
    }

    @Test
    void danger_withNoModelReply_stillReturnsTheSafetyText() {
        String reply = ChatReplyPolicy.compose(null, List.of(), EnumSet.of(ChatReplyPolicy.Danger.CHILD_AT_RISK));
        assertTrue(reply.contains("116"));
    }

    @Test
    void nothingToShow_returnsNull() {
        assertNull(ChatReplyPolicy.compose(null, List.of(), Set.of()));
    }

    @Test
    void detectsDangerPhrases() {
        assertTrue(ChatReplyPolicy.detectDanger("my husband is going to kill me tonight")
                .contains(ChatReplyPolicy.Danger.IMMEDIATE_DANGER));
        assertTrue(ChatReplyPolicy.detectDanger("my daughter was defiled")
                .contains(ChatReplyPolicy.Danger.CHILD_AT_RISK));
        assertTrue(ChatReplyPolicy.detectDanger("I want to die")
                .contains(ChatReplyPolicy.Danger.SELF_HARM));
    }

    @Test
    void ordinaryLegalQuestions_areNotDanger() {
        assertTrue(ChatReplyPolicy.detectDanger("What is the penalty for land grabbing?").isEmpty());
        assertTrue(ChatReplyPolicy.detectDanger("How do I report a boundary dispute to the LC?").isEmpty());
        assertTrue(ChatReplyPolicy.detectDanger(null).isEmpty());
    }
}
