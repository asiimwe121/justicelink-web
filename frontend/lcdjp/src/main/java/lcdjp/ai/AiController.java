package lcdjp.ai;

import lcdjp.common.RateLimited;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final FailoverChatProvider providers;
    private final AiOrchestratorService aiOrchestratorService;

    public AiController(FailoverChatProvider providers, AiOrchestratorService aiOrchestratorService) {
        this.providers = providers;
        this.aiOrchestratorService = aiOrchestratorService;
    }

    @PostMapping("/chat")
    @RateLimited(limit = 15, durationMinutes = 1, dailyLimit = 200, globalDailyLimit = 5000, failClosed = true)
    public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {

        log.info("[AI] /api/ai/chat — session={} category={} message={}",
                request.getSessionId(),
                request.getCategory(),
                abbreviate(request.getMessage(), 80));

        log.info("[AI] Provider order: {}", providers.chainNames());

        AiOrchestratorService.Outcome outcome = aiOrchestratorService.handle(request);

        if (outcome.reply != null && !outcome.reply.isBlank()) {
            log.info("[AI] Returning reply ({} chars, legalRagUsed={}, sources={})",
                    outcome.reply.length(), outcome.legalRagUsed, outcome.sources.size());
            AiChatResponse response = AiChatResponse.of(outcome.reply.trim());
            response.setLegalRagUsed(outcome.legalRagUsed);
            response.setSources(outcome.sources);
            return ResponseEntity.ok(response);
        }

        log.warn("[AI] No reply from provider; sending fallback response (legalRagUsed={})", outcome.legalRagUsed);
        AiChatResponse fallback = AiChatResponse.fallback(
                "I'm having trouble processing that. Please try again."
        );
        fallback.setLegalRagUsed(outcome.legalRagUsed);
        return ResponseEntity.ok(fallback);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        ChatBackend primary = providers.primary();
        String model = primary != null ? primary.model() : null;

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("service", "AI Chat (" + providers.chainNames() + ")");
        health.put("model", model != null ? model : "NOT SET");
        health.put("apiKeyConfigured", providers.anyConfigured());
        health.put("modelConfigured", model != null && !model.isEmpty() && !model.contains("${"));
        health.put("providers", providers.status());
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(health);
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        ChatBackend primary = providers.primary();

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("model", primary != null ? primary.model() : "NOT SET");
        config.put("apiKeyConfigured", providers.anyConfigured());
        config.put("providers", providers.status());
        return ResponseEntity.ok(config);
    }

    private String abbreviate(String s, int max) {
        if (s == null) return "(null)";
        if (s.length() <= max) return s;
        return s.substring(0, max) + "…";
    }
}
