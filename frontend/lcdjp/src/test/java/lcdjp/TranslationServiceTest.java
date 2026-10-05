package lcdjp;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TranslationServiceTest {

    private static final String URL = "http://sunbird.test/tasks/translate";

    private TranslationService service(RestTemplate restTemplate, String token, boolean enabled) {
        return new TranslationService(restTemplate, token, URL, enabled, 1000, 24, 2);
    }

    private void stubReply(RestTemplate restTemplate, String json) {
        when(restTemplate.exchange(eq(URL), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(json));
    }

    @Test
    void translate_returnsTranslatedTextInInputOrder() {
        RestTemplate rest = mock(RestTemplate.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"Oli otya?\"}}");

        List<String> result = service(rest, "token", true).translate(List.of("How are you?"), "lug");

        assertEquals(List.of("Oli otya?"), result);
    }

    @Test
    void translate_cachesRepeatedTexts_andSendsEachUniqueTextOnce() {
        RestTemplate rest = mock(RestTemplate.class);
        stubReply(rest, "{\"output\":{\"text\":\"Ddiiru\"}}");
        TranslationService service = service(rest, "token", true);

        List<String> first = service.translate(List.of("Home", "Home"), "lug");
        List<String> second = service.translate(List.of("Home"), "lug");

        assertEquals(List.of("Ddiiru", "Ddiiru"), first);
        assertEquals(List.of("Ddiiru"), second);
        verify(rest, times(1)).exchange(eq(URL), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void translate_usesSeparateCacheEntriesPerLanguage() {
        RestTemplate rest = mock(RestTemplate.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"x\"}}");
        TranslationService service = service(rest, "token", true);

        service.translate(List.of("Home"), "lug");
        service.translate(List.of("Home"), "ach");

        verify(rest, times(2)).exchange(eq(URL), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void translate_returnsNullForTextsThatFail_andKeepsTheRest() {
        RestTemplate rest = mock(RestTemplate.class);
        when(rest.exchange(eq(URL), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenAnswer(invocation -> {
                    HttpEntity<?> entity = invocation.getArgument(2);
                    Map<?, ?> body = (Map<?, ?>) entity.getBody();
                    if ("Bad".equals(body.get("text"))) {
                        throw new HttpClientErrorException(HttpStatus.UNAUTHORIZED);
                    }
                    return ResponseEntity.ok("{\"output\":{\"translated_text\":\"Kirungi\"}}");
                });

        List<String> result = service(rest, "token", true).translate(Arrays.asList("Good", "Bad"), "lug");

        assertEquals("Kirungi", result.get(0));
        assertNull(result.get(1));
    }

    @Test
    void translate_skipsBlankTexts() {
        RestTemplate rest = mock(RestTemplate.class);
        stubReply(rest, "{\"output\":{\"translated_text\":\"Kirungi\"}}");

        List<String> result = service(rest, "token", true).translate(Arrays.asList("  ", null, "Good"), "lug");

        assertNull(result.get(0));
        assertNull(result.get(1));
        assertEquals("Kirungi", result.get(2));
    }

    @Test
    void translate_doesNothingWhenNoTokenIsConfigured() {
        RestTemplate rest = mock(RestTemplate.class);
        TranslationService service = service(rest, "", true);

        assertFalse(service.isAvailable());
        assertEquals(Arrays.asList((String) null), service.translate(List.of("Home"), "lug"));
        verifyNoInteractions(rest);
    }

    @Test
    void translate_doesNothingWhenDisabled() {
        RestTemplate rest = mock(RestTemplate.class);
        TranslationService service = service(rest, "token", false);

        assertFalse(service.isAvailable());
        assertEquals(Arrays.asList((String) null), service.translate(List.of("Home"), "lug"));
        verifyNoInteractions(rest);
    }

    @Test
    void translate_rejectsUnsupportedLanguages() {
        RestTemplate rest = mock(RestTemplate.class);

        List<String> result = service(rest, "token", true).translate(List.of("Home"), "fr");

        assertEquals(Arrays.asList((String) null), result);
        verifyNoInteractions(rest);
    }

    @Test
    void supportsExactlyTheFiveUgandanLanguagesInThePicker() {
        for (String code : List.of("lug", "ach", "teo", "lgg", "nyn")) {
            assertTrue(TranslationService.isSupported(code), code);
        }
        assertFalse(TranslationService.isSupported("en"));
        assertFalse(TranslationService.isSupported(null));
    }

    @Test
    void splitIntoChunks_keepsEveryChunkWithinTheLimit_andLosesNoText() {
        String longText = "This is a sentence. ".repeat(100);

        List<String> chunks = TranslationService.splitIntoChunks(longText);

        assertTrue(chunks.size() > 1);
        chunks.forEach(chunk -> assertTrue(chunk.length() <= TranslationService.MAX_CHARS_PER_CALL));
        assertEquals(longText.trim(), String.join(" ", chunks));
    }

    @Test
    void splitIntoChunks_leavesShortTextAlone() {
        assertEquals(List.of("Track your case"), TranslationService.splitIntoChunks("Track your case"));
    }
}
