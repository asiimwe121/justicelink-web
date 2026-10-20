package lcdjp.ai;

import lcdjp.common.OutboundHttp;
import lcdjp.common.TransientProviderException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class GeminiServiceHttpTest {

    private GeminiProperties props(String key) {
        GeminiProperties props = new GeminiProperties();
        props.getApi().setKey(key);
        props.getApi().setUrl("http://gemini.test/chat");
        return props;
    }

    private AiChatRequest request(String message) {
        AiChatRequest r = new AiChatRequest();
        r.setMessage(message);
        return r;
    }

    @Test
    void defaultsPointAtGeminisOpenAiCompatibleEndpoint() {
        GeminiProperties defaults = new GeminiProperties();

        assertEquals("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaults.getApi().getUrl());
        assertEquals("gemini-3.5-flash-lite", defaults.getModel());
    }

    @Test
    void sendsTheBearerKeyAndModelAndReturnsTheTrimmedReply() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenReturn(new OutboundHttp.Response(200, "{\"choices\":[{\"message\":{\"content\":\"  Hi from Gemini \"}}]}"));
        GeminiService service = new GeminiService(props("g-key"), http);

        assertEquals("Hi from Gemini", service.chat(request("Hi")));

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(http).postJson(eq("http://gemini.test/chat"),
                eq(Map.of("Authorization", "Bearer g-key", "Accept", "application/json")),
                body.capture(), any(Duration.class));
        assertTrue(body.getValue().contains("\"model\":\"gemini-3.5-flash-lite\""), body.getValue());
        assertFalse(body.getValue().contains("reasoning_effort"), "not sent unless configured");
    }

    @Test
    void sendsReasoningEffortOnlyWhenConfigured() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenReturn(new OutboundHttp.Response(200, "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}"));
        GeminiProperties props = props("g-key");
        props.setReasoningEffort(" low ");

        new GeminiService(props, http).chat(request("Hi"));

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(http).postJson(anyString(), anyMap(), body.capture(), any(Duration.class));
        assertTrue(body.getValue().contains("\"reasoning_effort\":\"low\""), body.getValue());
    }

    @Test
    void withoutAKeyItIsNotConfiguredAndNeverCallsOut() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        GeminiService service = new GeminiService(props(""), http);

        assertFalse(service.isConfigured());
        assertNull(service.chat(request("Hi")));
        verify(http, never()).postJson(anyString(), anyMap(), anyString(), any(Duration.class));
    }

    @Test
    void providerErrorsBecomeNullSoTheChainCanMoveOn() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenThrow(new TransientProviderException("rate limited", 429, "", 0));

        assertNull(new GeminiService(props("g-key"), http).chat(request("Hi")));
    }

    @Test
    void hasItsOwnNameForTheProviderOrder() {
        assertEquals("gemini", new GeminiService(props("g-key"), mock(OutboundHttp.class)).name());
        assertEquals("groq", new GroqService(new GroqProperties(), mock(OutboundHttp.class)).name());
    }
}
