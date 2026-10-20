package lcdjp.translation;

import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import lcdjp.common.TransientProviderException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TranslationServiceTest {

    private static final String URL = "http://sunbird.test/tasks/translate";

    private TranslationService service(OutboundHttp restTemplate, String token, boolean enabled) {
        return new TranslationService(restTemplate, token, URL, enabled, 1000, 24, 2);
    }

    private TranslationService limited(OutboundHttp restTemplate, int maxConcurrent, int queueCapacity) {
        return new TranslationService(restTemplate, "token", URL, true, 1000, 24, 2, maxConcurrent, queueCapacity);
    }

    private void stubReply(OutboundHttp http, String json) throws Exception {
        when(http.postJson(eq(URL), anyMap(), anyString(), any(Duration.class)))
                .thenReturn(new OutboundHttp.Response(200, json));
    }

    @Test
    void translate_returnsTranslatedTextInInputOrder() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"Oli otya?\"}}");

        List<String> result = service(rest, "token", true).translate(List.of("How are you?"), "lug");

        assertEquals(List.of("Oli otya?"), result);
    }

    @Test
    void translate_cachesRepeatedTexts_andSendsEachUniqueTextOnce() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        stubReply(rest, "{\"output\":{\"text\":\"Ddiiru\"}}");
        TranslationService service = service(rest, "token", true);

        List<String> first = service.translate(List.of("Home", "Home"), "lug");
        List<String> second = service.translate(List.of("Home"), "lug");

        assertEquals(List.of("Ddiiru", "Ddiiru"), first);
        assertEquals(List.of("Ddiiru"), second);
        verify(rest, times(1)).postJson(eq(URL), anyMap(), anyString(), any(Duration.class));
    }

    @Test
    void translate_usesSeparateCacheEntriesPerLanguage() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"x\"}}");
        TranslationService service = service(rest, "token", true);

        service.translate(List.of("Home"), "lug");
        service.translate(List.of("Home"), "ach");

        verify(rest, times(2)).postJson(eq(URL), anyMap(), anyString(), any(Duration.class));
    }

    @Test
    void translate_returnsNullForTextsThatFail_andKeepsTheRest() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        when(rest.postJson(eq(URL), anyMap(), anyString(), any(Duration.class)))
                .thenAnswer(invocation -> {
                    String body = invocation.getArgument(2);
                    if (body.contains("\"text\":\"Bad\"")) {
                        throw new ProviderRejectedException("rejected", 401, "");
                    }
                    return new OutboundHttp.Response(200, "{\"output\":{\"translated_text\":\"Kirungi\"}}");
                });

        List<String> result = service(rest, "token", true).translate(Arrays.asList("Good", "Bad"), "lug");

        assertEquals("Kirungi", result.get(0));
        assertNull(result.get(1));
    }

    @Test
    void translate_turnsCallersAwayWhenTheProviderIsBusy() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"x\"}}");
        TranslationService service = limited(rest, 1, 10);
        assertTrue(service.bulkhead().tryAcquire()); // another request is already inside the provider

        List<String> result = service.translate(List.of("Home"), "lug");

        assertEquals(Arrays.asList((String) null), result);
        verifyNoInteractions(rest);
    }

    @Test
    void translate_stillServesCachedTextsWhileTheProviderIsBusy() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        stubReply(rest, "{\"output\":{\"text\":\"Ddiiru\"}}");
        TranslationService service = limited(rest, 1, 10);
        service.translate(List.of("Home"), "lug"); // fills the cache
        assertTrue(service.bulkhead().tryAcquire());

        List<String> result = service.translate(Arrays.asList("Home", "Brand new"), "lug");

        assertEquals(Arrays.asList("Ddiiru", null), result);
        verify(rest, times(1)).postJson(eq(URL), anyMap(), anyString(), any(Duration.class));
    }

    @Test
    void translate_releasesItsSlotAfterSuccessAndAfterFailure() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        when(rest.postJson(eq(URL), anyMap(), anyString(), any(Duration.class)))
                .thenThrow(new ProviderRejectedException("rejected", 401, ""))
                .thenReturn(new OutboundHttp.Response(200, "{\"output\":{\"translated_text\":\"Kirungi\"}}"));
        TranslationService service = limited(rest, 1, 10);

        assertNull(service.translate(List.of("Bad"), "lug").get(0));
        assertEquals(1, service.bulkhead().available());

        assertEquals("Kirungi", service.translate(List.of("Good"), "lug").get(0));
        assertEquals(1, service.bulkhead().available());
    }

    @Test
    void translate_skipsTextsWhenTheWorkQueueIsFull() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        when(rest.postJson(eq(URL), anyMap(), anyString(), any(Duration.class)))
                .thenAnswer(invocation -> {
                    Thread.sleep(200);
                    return new OutboundHttp.Response(200, "{\"output\":{\"translated_text\":\"ok\"}}");
                });
        // One worker and room for one waiting text: the third distinct text cannot be accepted.
        TranslationService service = new TranslationService(rest, "token", URL, true, 1000, 24, 1, 6, 1);

        List<String> result = service.translate(List.of("One", "Two", "Three"), "lug");

        assertEquals("ok", result.get(0));
        assertEquals("ok", result.get(1));
        assertNull(result.get(2));
        verify(rest, times(2)).postJson(eq(URL), anyMap(), anyString(), any(Duration.class));
    }

    @Test
    void translate_pausesAfterRateLimiting_andLeavesTextUntranslated() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        when(rest.postJson(eq(URL), anyMap(), anyString(), any(Duration.class)))
                .thenThrow(new TransientProviderException("slow down", 429, "", 0));
        TranslationService service = service(rest, "token", true);

        assertNull(service.translate(List.of("One"), "lug").get(0));
        assertNull(service.translate(List.of("Two"), "lug").get(0));

        // The second request is skipped without calling Sunbird again during the 60-second pause.
        verify(rest, times(1)).postJson(eq(URL), anyMap(), anyString(), any(Duration.class));
    }

    @Test
    void translate_skipsBlankTexts() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"Kirungi\"}}");

        List<String> result = service(rest, "token", true).translate(Arrays.asList("  ", null, "Good"), "lug");

        assertNull(result.get(0));
        assertNull(result.get(1));
        assertEquals("Kirungi", result.get(2));
    }

    @Test
    void translate_doesNothingWhenNoTokenIsConfigured() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        TranslationService service = service(rest, "", true);

        assertFalse(service.isAvailable());
        assertEquals(Arrays.asList((String) null), service.translate(List.of("Home"), "lug"));
        verifyNoInteractions(rest);
    }

    @Test
    void translate_doesNothingWhenDisabled() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);
        TranslationService service = service(rest, "token", false);

        assertFalse(service.isAvailable());
        assertEquals(Arrays.asList((String) null), service.translate(List.of("Home"), "lug"));
        verifyNoInteractions(rest);
    }

    @Test
    void translate_rejectsUnsupportedLanguages() throws Exception {
        OutboundHttp rest = mock(OutboundHttp.class);

        List<String> result = service(rest, "token", true).translate(List.of("Home"), "fr");

        assertEquals(Arrays.asList((String) null), result);
        verifyNoInteractions(rest);
    }

    @Test
    void supportsExactlyTheFiveUgandanLanguagesInThePicker() throws Exception {
        for (String code : List.of("lug", "ach", "teo", "lgg", "nyn")) {
            assertTrue(TranslationService.isSupported(code), code);
        }
        assertFalse(TranslationService.isSupported("en"));
        assertFalse(TranslationService.isSupported(null));
    }

    @Test
    void splitIntoChunks_keepsEveryChunkWithinTheLimit_andLosesNoText() throws Exception {
        String longText = "This is a sentence. ".repeat(100);

        List<String> chunks = TranslationService.splitIntoChunks(longText);

        assertTrue(chunks.size() > 1);
        chunks.forEach(chunk -> assertTrue(chunk.length() <= TranslationService.MAX_CHARS_PER_CALL));
        assertEquals(longText.trim(), String.join(" ", chunks));
    }

    @Test
    void splitIntoChunks_leavesShortTextAlone() throws Exception {
        assertEquals(List.of("Track your case"), TranslationService.splitIntoChunks("Track your case"));
    }
}
