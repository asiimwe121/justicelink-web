package lcdjp.ai;

import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class HuggingFaceEmbeddingServiceTest {

    private HuggingFaceEmbeddingService service(OutboundHttp http) {
        HuggingFaceEmbeddingService service = new HuggingFaceEmbeddingService(http);
        ReflectionTestUtils.setField(service, "apiKey", "hf-key");
        ReflectionTestUtils.setField(service, "embeddingModel", "model/x");
        ReflectionTestUtils.setField(service, "embeddingBaseUrl", "http://hf.test/models/");
        return service;
    }

    @Test
    void returnsTheVectorAndSendsBearerKeyToTheModelUrl() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class), anyLong()))
                .thenReturn(new OutboundHttp.Response(200, "[0.5, 1.5, 2.5]"));

        List<Float> vector = service(http).embed("hello");

        assertEquals(List.of(0.5f, 1.5f, 2.5f), vector);
        verify(http).postJson(eq("http://hf.test/models/model/x/pipeline/feature-extraction"),
                eq(Map.of("Accept", "application/json", "Authorization", "Bearer hf-key")),
                contains("\"inputs\":\"hello\""), any(Duration.class), eq(15_000L));
    }

    @Test
    void averagesTokenVectors() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class), anyLong()))
                .thenReturn(new OutboundHttp.Response(200, "[[1.0, 2.0], [3.0, 4.0]]"));

        assertEquals(List.of(2.0f, 3.0f), service(http).embed("hello"));
    }

    @Test
    void emptyBodyIsAnError() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class), anyLong()))
                .thenReturn(new OutboundHttp.Response(200, ""));

        assertThrows(IllegalStateException.class, () -> service(http).embed("hello"));
    }

    @Test
    void providerRejectionSurfacesToTheCaller() throws Exception {
        OutboundHttp http = mock(OutboundHttp.class);
        when(http.postJson(anyString(), anyMap(), anyString(), any(Duration.class), anyLong()))
                .thenThrow(new ProviderRejectedException("bad key", 401, "nope"));

        assertThrows(ProviderRejectedException.class, () -> service(http).embed("hello"));
    }

    @Test
    void missingKeyOrTextFailsBeforeAnyCall() {
        OutboundHttp http = mock(OutboundHttp.class);
        HuggingFaceEmbeddingService noKey = new HuggingFaceEmbeddingService(http);

        assertThrows(IllegalStateException.class, () -> noKey.embed("hello"));
        assertThrows(IllegalArgumentException.class, () -> service(http).embed(" "));
        verifyNoMoreInteractions(http);
    }
}
