package lcdjp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TranslationControllerTest {

    @Mock private TranslationService translationService;

    @InjectMocks
    private TranslationController controller;

    private TranslateRequest request(List<String> texts, String target) {
        TranslateRequest request = new TranslateRequest();
        request.setTexts(texts);
        request.setTarget(target);
        return request;
    }

    @Test
    void translate_returnsTranslationsFromTheService() {
        when(translationService.isAvailable()).thenReturn(true);
        when(translationService.translate(List.of("Home"), "lug")).thenReturn(List.of("Ddiiru"));

        ResponseEntity<?> result = controller.translate(request(List.of("Home"), "lug"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("lug", body.get("target"));
        assertEquals(List.of("Ddiiru"), body.get("translations"));
    }

    @Test
    void translate_rejectsEmptyRequests() {
        assertEquals(HttpStatus.BAD_REQUEST, controller.translate(request(List.of(), "lug")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.translate(request(null, "lug")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.translate(null).getStatusCode());
    }

    @Test
    void translate_rejectsUnsupportedLanguage() {
        ResponseEntity<?> result = controller.translate(request(List.of("Home"), "fr"));

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(translationService, never()).translate(anyList(), anyString());
    }

    @Test
    void translate_rejectsTooManyTexts() {
        List<String> texts = new ArrayList<>();
        for (int i = 0; i <= TranslationController.MAX_TEXTS; i++) {
            texts.add("text " + i);
        }

        assertEquals(HttpStatus.BAD_REQUEST, controller.translate(request(texts, "lug")).getStatusCode());
    }

    @Test
    void translate_rejectsOversizedText() {
        String huge = "a".repeat(TranslationController.MAX_TEXT_CHARS + 1);

        assertEquals(HttpStatus.BAD_REQUEST, controller.translate(request(List.of(huge), "lug")).getStatusCode());
    }

    @Test
    void translate_reportsUnavailableWhenNotConfigured() {
        when(translationService.isAvailable()).thenReturn(false);

        ResponseEntity<?> result = controller.translate(request(List.of("Home"), "lug"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
    }

    @Test
    void status_reportsAvailability() {
        when(translationService.isAvailable()).thenReturn(true);

        ResponseEntity<?> result = controller.status();

        assertEquals(true, ((Map<?, ?>) result.getBody()).get("available"));
    }
}
