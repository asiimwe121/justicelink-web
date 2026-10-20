package lcdjp.ai;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import lcdjp.common.TransientProviderException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class GroqServiceHttpTest {

    private GroqService service(OutboundHttp http) {
        GroqProperties props = new GroqProperties();
        props.getApi().setKey("groq-key");
        props.getApi().setUrl("http://groq.test/chat");
        return new GroqService(props, http);
    }

    private AiChatRequest request(String message) {
        AiChatRequest r = new AiChatRequest();
        r.setMessage(message);
        return r;
    }

    @Test
    void returnsTheTrimmedReplyAndSendsTheBearerKey() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenReturn(new OutboundHttp.Response(200, "{\"choices\":[{\"message\":{\"content\":\"  Hello there \"}}]}"));

        String reply = service(http).chat(request("Hi"));

        assertEquals("Hello there", reply);
        verify(http).postJson(eq("http://groq.test/chat"),
                eq(Map.of("Authorization", "Bearer groq-key", "Accept", "application/json")),
                contains("\"messages\""), any(Duration.class));
    }

    @Test
    void providerErrorsBecomeTheFallbackNull() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenThrow(new TransientProviderException("overloaded", 503, "", 0));

        assertNull(service(http).chat(request("Hi")));
    }

    @Test
    void openCircuitBecomesTheFallbackNull() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenThrow(new OutboundGuard.CircuitOpenException("groq-chat"));

        assertNull(service(http).chat(request("Hi")));
    }

    @Test
    void emptyChoicesBecomeNull() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenReturn(new OutboundHttp.Response(200, "{\"choices\":[]}"));

        assertNull(service(http).chat(request("Hi")));
    }

    @Test
    void theSlotIsReleasedAfterAFailure() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class)))
                .thenThrow(new TransientProviderException("overloaded", 503, "", 0));
        GroqService service = service(http);
        service.setMaxConcurrent(1);

        service.chat(request("Hi"));

        assertEquals(1, service.bulkhead().available());
    }
}
