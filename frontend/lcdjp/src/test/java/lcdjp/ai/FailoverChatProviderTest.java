package lcdjp.ai;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FailoverChatProviderTest {

    private ChatBackend backend(String name, boolean configured, String reply) {
        ChatBackend b = mock(ChatBackend.class);
        when(b.name()).thenReturn(name);
        when(b.model()).thenReturn(name + "-model");
        when(b.isConfigured()).thenReturn(configured);
        when(b.chat(any())).thenReturn(reply);
        return b;
    }

    @Test
    void firstProviderAnswersAndTheSecondIsNeverCalled() {
        ChatBackend groq = backend("groq", true, "from groq");
        ChatBackend gemini = backend("gemini", true, "from gemini");

        assertEquals("from groq", new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));

        verify(gemini, never()).chat(any());
    }

    @Test
    void fallsOverToTheNextProviderWhenTheFirstReturnsNull() {
        ChatBackend groq = backend("groq", true, null);
        ChatBackend gemini = backend("gemini", true, "from gemini");

        assertEquals("from gemini", new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));
    }

    @Test
    void aBlankReplyCountsAsAFailure() {
        ChatBackend groq = backend("groq", true, "   ");
        ChatBackend gemini = backend("gemini", true, "from gemini");

        assertEquals("from gemini", new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));
    }

    @Test
    void aProviderThatThrowsDoesNotStopTheChain() {
        ChatBackend groq = backend("groq", true, null);
        when(groq.chat(any())).thenThrow(new IllegalStateException("boom"));
        ChatBackend gemini = backend("gemini", true, "from gemini");

        assertEquals("from gemini", new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));
    }

    @Test
    void aProviderWithoutAKeyIsSkippedWithoutBeingCalled() {
        ChatBackend groq = backend("groq", false, "should not be used");
        ChatBackend gemini = backend("gemini", true, "from gemini");

        assertEquals("from gemini", new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));

        verify(groq, never()).chat(any());
    }

    @Test
    void returnsNullWhenEveryProviderFails() {
        ChatBackend groq = backend("groq", true, null);
        ChatBackend gemini = backend("gemini", true, null);

        assertNull(new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));
    }

    @Test
    void returnsNullWhenNothingIsConfigured() {
        ChatBackend groq = backend("groq", false, "x");
        ChatBackend gemini = backend("gemini", false, "y");

        assertNull(new FailoverChatProvider(List.of(groq, gemini)).chat(new AiChatRequest()));
        verify(groq, never()).chat(any());
        verify(gemini, never()).chat(any());
    }

    @Test
    void theOrderComesFromTheSetting() {
        ChatBackend groq = backend("groq", true, "from groq");
        ChatBackend gemini = backend("gemini", true, "from gemini");

        FailoverChatProvider geminiFirst = new FailoverChatProvider(List.of(groq, gemini), "gemini, groq");

        assertEquals("from gemini", geminiFirst.chat(new AiChatRequest()));
        assertEquals("gemini -> groq", geminiFirst.chainNames());
    }

    @Test
    void unknownNamesAreIgnoredAndAnEmptyResultFallsBackToAllProviders() {
        ChatBackend groq = backend("groq", true, "from groq");
        ChatBackend gemini = backend("gemini", true, "from gemini");

        assertEquals("groq", new FailoverChatProvider(List.of(groq, gemini), "nonsense, GROQ").chainNames());
        assertEquals("groq -> gemini", new FailoverChatProvider(List.of(groq, gemini), "nonsense").chainNames());
        assertEquals("groq -> gemini", new FailoverChatProvider(List.of(groq, gemini), "").chainNames());
    }

    @Test
    void statusListsEachProviderWithoutAnyKey() {
        ChatBackend groq = backend("groq", true, "x");
        ChatBackend gemini = backend("gemini", false, "y");

        List<?> status = new FailoverChatProvider(List.of(groq, gemini)).status();

        assertEquals(2, status.size());
        assertEquals("{name=groq, model=groq-model, apiKeyConfigured=true}", status.get(0).toString());
        assertEquals("{name=gemini, model=gemini-model, apiKeyConfigured=false}", status.get(1).toString());
    }
}
