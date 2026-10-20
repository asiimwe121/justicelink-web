package lcdjp.ai;

import lcdjp.chat.ChatReplyPolicy;
import lcdjp.legal.LegalIntentDetector;
import lcdjp.legal.LegalKnowledgeRetrievalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AiOrchestratorChatPolicyTest {

    private LegalKnowledgeRetrievalService retrieval;
    private AiChatProvider provider;
    private AiOrchestratorService orchestrator;

    @BeforeEach
    void setUp() {
        retrieval = mock(LegalKnowledgeRetrievalService.class);
        provider = mock(AiChatProvider.class);
        orchestrator = new AiOrchestratorService(new LegalIntentDetector(), retrieval, provider);
    }

    private AiChatRequest request(String message, String context) {
        AiChatRequest r = new AiChatRequest();
        r.setMessage(message);
        r.setContext(context);
        return r;
    }

    private LegalKnowledgeRetrievalService.RetrievedChunk chunk(double score) {
        LegalKnowledgeRetrievalService.RetrievedChunk c = new LegalKnowledgeRetrievalService.RetrievedChunk();
        c.documentTitle = "Constitution of Uganda";
        c.legalSection = "Article 23";
        c.pageNumber = 5;
        c.relativeSourcePath = "constitution.pdf";
        c.chunkText = "Text of the article.";
        c.score = score;
        return c;
    }

    @Test
    void legalQuestionWithNoSource_getsFixedReferral_andModelIsNotAsked() throws Exception {
        when(retrieval.search(anyString(), anyInt())).thenReturn(List.of());

        AiOrchestratorService.Outcome out = orchestrator.handle(
                request("What is the penalty for land grabbing under the law?", "Legal aid help"));

        assertEquals(ChatReplyPolicy.NO_SOURCE_REPLY, out.reply);
        assertFalse(out.legalRagUsed);
        verify(provider, never()).chat(any());
    }

    @Test
    void legalQuestionWithSource_endsWithSourcesAndDisclaimer() throws Exception {
        when(retrieval.search(anyString(), anyInt())).thenReturn(List.of(chunk(0.8)));
        when(provider.chat(any())).thenReturn("Police must bring you before a court within 48 hours.");

        AiOrchestratorService.Outcome out = orchestrator.handle(
                request("How long can the police hold me before court?", "Legal aid help"));

        assertTrue(out.legalRagUsed);
        assertEquals(1, out.sources.size());
        assertTrue(out.reply.contains("Sources used:\n- Constitution of Uganda, Article 23, page 5"));
        assertTrue(out.reply.contains("not legal advice"));
    }

    @Test
    void greetingInLegalContext_isStillAnsweredByTheModel() throws Exception {
        when(retrieval.search(anyString(), anyInt())).thenReturn(List.of());
        when(provider.chat(any())).thenReturn("Hello! How can I help?");

        AiOrchestratorService.Outcome out = orchestrator.handle(request("hello there", "Legal aid help"));

        assertEquals("Hello! How can I help?", out.reply);
        verify(provider).chat(any());
    }

    @Test
    void dangerMessage_getsEmergencyNumbersFirst() throws Exception {
        when(retrieval.search(anyString(), anyInt())).thenReturn(List.of());
        when(provider.chat(any())).thenReturn("I am here to help.");

        AiOrchestratorService.Outcome out = orchestrator.handle(
                request("My husband is going to kill me, what should I do", null));

        assertTrue(out.reply.startsWith("If you are in danger right now"));
        assertTrue(out.reply.contains("999"));
    }

    @Test
    void classificationPath_isUnchanged() throws Exception {
        when(retrieval.search(anyString(), anyInt())).thenReturn(List.of());
        when(provider.chat(any())).thenReturn("CATEGORY: Land Matter\nEXPLANATION: Land boundary.");

        AiOrchestratorService.Outcome out = orchestrator.handle(
                request("My neighbour moved the boundary of our plot", "classify"), true);

        assertEquals("CATEGORY: Land Matter\nEXPLANATION: Land boundary.", out.reply);
        verify(provider).chat(any());
    }
}
