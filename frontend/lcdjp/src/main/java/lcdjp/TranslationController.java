package lcdjp;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/translate")
public class TranslationController {

    static final int MAX_TEXTS = 40;
    static final int MAX_TEXT_CHARS = 2000;
    static final int MAX_TOTAL_CHARS = 12000;

    private final TranslationService translationService;

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(Map.of("available", translationService.isAvailable()));
    }

    @PostMapping
    @RateLimited(limit = 120, durationMinutes = 1)
    public ResponseEntity<?> translate(@RequestBody TranslateRequest request) {
        if (request == null || request.getTexts() == null || request.getTexts().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "texts is required"));
        }
        if (!TranslationService.isSupported(request.getTarget())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported target language"));
        }
        List<String> texts = request.getTexts();
        if (texts.size() > MAX_TEXTS) {
            return ResponseEntity.badRequest().body(Map.of("error", "At most " + MAX_TEXTS + " texts per request"));
        }
        int total = 0;
        for (String text : texts) {
            if (text == null) {
                continue;
            }
            if (text.length() > MAX_TEXT_CHARS) {
                return ResponseEntity.badRequest().body(Map.of("error", "A text is too long"));
            }
            total += text.length();
        }
        if (total > MAX_TOTAL_CHARS) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request is too large"));
        }
        if (!translationService.isAvailable()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Translation is not configured"));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("target", request.getTarget());
        body.put("translations", translationService.translate(texts, request.getTarget()));
        return ResponseEntity.ok(body);
    }
}
