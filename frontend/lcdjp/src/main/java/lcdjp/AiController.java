package lcdjp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "huggingface")
class HuggingFaceProperties {
    private String model = "meta-llama/Llama-3.3-70B-Instruct";
    private Api api = new Api();

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Api getApi() { return api; }
    public void setApi(Api api) { this.api = api; }

    public static class Api {
        private String key;

        private String url = "https://router.huggingface.co/v1/chat/completions";

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }
}

class AiChatTurn {
    private String role;
    private String content;

    public AiChatTurn() {}

    public AiChatTurn(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}

class AiChatRequest {
    static final int MAX_HISTORY_TURNS = 12;
    static final int MAX_TURN_CHARS = 1500;

    private String message;
    private String context;
    private String category;
    private Map<String, Object> answers;
    private String sessionId;

    private boolean disguise;

    // Earlier turns of THIS conversation, supplied by the client so the model can follow up on what was
    // already said. Sanitised in setHistory: only user/assistant roles are accepted (a client can never inject
    // a "system" turn), each turn is length-capped, and only the most recent turns are kept.
    private List<AiChatTurn> history = new java.util.ArrayList<>();

    // Server-side overrides used by internal callers (e.g. intake); never read from the client.
    private Integer maxTokens;
    private Double temperature;

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Map<String, Object> getAnswers() { return answers; }
    public void setAnswers(Map<String, Object> answers) { this.answers = answers; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    @JsonIgnore
    public boolean isDisguise() { return disguise; }
    @JsonIgnore
    public void setDisguise(boolean disguise) { this.disguise = disguise; }

    public List<AiChatTurn> getHistory() { return history; }
    public void setHistory(List<AiChatTurn> history) {
        List<AiChatTurn> clean = new java.util.ArrayList<>();
        if (history != null) {
            for (AiChatTurn t : history) {
                if (t == null || t.getContent() == null) continue;
                String role = t.getRole() == null ? "" : t.getRole().trim().toLowerCase(java.util.Locale.ROOT);
                if (!role.equals("user") && !role.equals("assistant")) continue;
                String content = t.getContent().trim();
                if (content.isEmpty()) continue;
                if (content.length() > MAX_TURN_CHARS) content = content.substring(0, MAX_TURN_CHARS);
                clean.add(new AiChatTurn(role, content));
            }
        }
        int from = Math.max(0, clean.size() - MAX_HISTORY_TURNS);
        this.history = new java.util.ArrayList<>(clean.subList(from, clean.size()));
    }
    @JsonIgnore
    public Integer getMaxTokens() { return maxTokens; }
    @JsonIgnore
    public void setMaxTokens(Integer maxTokens) { this.maxTokens = maxTokens; }
    @JsonIgnore
    public Double getTemperature() { return temperature; }
    @JsonIgnore
    public void setTemperature(Double temperature) { this.temperature = temperature; }
}

class AiChatResponse {
    private String reply;
    private boolean fallback;

    private boolean legalRagUsed;

    private List<LegalSourceReference> sources = new java.util.ArrayList<>();

    public AiChatResponse() {}

    public AiChatResponse(String reply, boolean fallback) {
        this.reply = reply;
        this.fallback = fallback;
    }

    public static AiChatResponse of(String reply) {
        return new AiChatResponse(reply, false);
    }

    public static AiChatResponse fallback(String reply) {
        return new AiChatResponse(reply, true);
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
    public boolean isFallback() { return fallback; }
    public void setFallback(boolean fallback) { this.fallback = fallback; }
    public boolean isLegalRagUsed() { return legalRagUsed; }
    public void setLegalRagUsed(boolean legalRagUsed) { this.legalRagUsed = legalRagUsed; }
    public List<LegalSourceReference> getSources() { return sources; }
    public void setSources(List<LegalSourceReference> sources) { this.sources = sources; }
}

@Service
class HuggingFaceService implements AiChatProvider {
    private static final Logger log = LoggerFactory.getLogger(HuggingFaceService.class);

    private final HuggingFaceProperties props;
    private final RestTemplate restTemplate;

    public HuggingFaceService(HuggingFaceProperties props) {
        this.props = props;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(25000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public String chat(AiChatRequest request) {
        try {
            List<Map<String, String>> messages = buildMessages(request);

            String apiKey = props.getApi().getKey();

            String url = props.getApi().getUrl();

            log.info("[HuggingFace] Calling API with model: {}", props.getModel());
            log.info("[HuggingFace] API Key status: {}", apiKey != null && !apiKey.isEmpty() && !apiKey.contains("${") ? "✅ Configured" : "❌ Not configured");

            if (apiKey == null || apiKey.isEmpty() || apiKey.contains("${")) {
                log.error("[HuggingFace] API key is not properly configured!");
                return null;
            }

            int maxTokens = request.getMaxTokens() != null ? request.getMaxTokens() : 700;
            double temperature = request.getTemperature() != null ? request.getTemperature() : 0.7;

            Map<String, Object> body = Map.of(
                "model", props.getModel(),
                "messages", messages,
                "max_tokens", maxTokens,
                "temperature", temperature
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("[HuggingFace] Non-2xx response: {}", response.getStatusCode());
                return null;
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            if (choices == null || choices.isEmpty()) {
                log.warn("[HuggingFace] No choices in response");
                return null;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String reply = message != null ? (String) message.get("content") : null;

            if (reply == null || reply.isBlank()) {
                log.warn("[HuggingFace] Empty reply from API");
                return null;
            }

            log.info("[HuggingFace] Reply received ({} chars)", reply.length());
            return reply.trim();

        } catch (Exception e) {
            log.error("[HuggingFace] API call failed: {}", e.getMessage());
            log.error("Unexpected error", e);
            return null;
        }
    }

    private List<Map<String, String>> buildMessages(AiChatRequest req) {
        List<Map<String, String>> messages = new java.util.ArrayList<>();

        if ("start_chat_greeting".equals(req.getMessage())) {
            messages.add(Map.of("role", "user",
                    "content", req.getContext() != null ? req.getContext() : "Hello! How can I help you today?"));
            return messages;
        }

        StringBuilder sys = new StringBuilder();
        sys.append("You are a helpful assistant for a legal and community platform called LCDJP (JusticeLink) in Uganda. ");
        sys.append("Provide clear, accurate, and professional responses. ");
        sys.append("If you don't know something, say so honestly. ");
        sys.append("This is an ongoing conversation: read all of it, resolve references such as \"it\", \"that\" or ");
        sys.append("\"the second one\" from earlier turns, answer exactly what the person is asking now even if it is ");
        sys.append("not something you expected, and do not repeat information you have already given.");

        if (req.getContext() != null && !req.getContext().isBlank()) {
            sys.append("\n\n").append(req.getContext());
        }
        messages.add(Map.of("role", "system", "content", sys.toString()));

        for (AiChatTurn turn : req.getHistory()) {
            messages.add(Map.of("role", turn.getRole(), "content", turn.getContent()));
        }

        messages.add(Map.of("role", "user", "content", req.getMessage() == null ? "" : req.getMessage()));
        return messages;
    }
}

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final HuggingFaceService huggingFaceService;
    private final HuggingFaceProperties huggingFaceProperties;
    private final AiOrchestratorService aiOrchestratorService;

    public AiController(HuggingFaceService huggingFaceService, HuggingFaceProperties huggingFaceProperties,
                         AiOrchestratorService aiOrchestratorService) {
        this.huggingFaceService = huggingFaceService;
        this.huggingFaceProperties = huggingFaceProperties;
        this.aiOrchestratorService = aiOrchestratorService;
    }

    @PostMapping("/chat")
    @RateLimited(limit = 15, durationMinutes = 1)
    public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {

        log.info("[AI] /api/ai/chat — session={} category={} message={}",
                request.getSessionId(),
                request.getCategory(),
                abbreviate(request.getMessage(), 80));

        String apiKey = huggingFaceProperties.getApi().getKey();
        log.info("[AI] HuggingFace config - Model: {}, API Key: {}",
                huggingFaceProperties.getModel(),
                maskKey(apiKey));

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
        String model = huggingFaceProperties.getModel();
        String apiKey = huggingFaceProperties.getApi().getKey();

        boolean isConfigured = apiKey != null && !apiKey.isEmpty() && !apiKey.contains("${");
        boolean modelConfigured = model != null && !model.isEmpty() && !model.contains("${");

        Map<String, Object> health = Map.of(
                "status", "UP",
                "service", "AI Chat (HuggingFace)",
                "model", model != null ? model : "NOT SET",
                "apiKeyConfigured", isConfigured,
                "modelConfigured", modelConfigured,
                "timestamp", System.currentTimeMillis()
        );
        return ResponseEntity.ok(health);
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        String apiKey = huggingFaceProperties.getApi().getKey();
        boolean isConfigured = apiKey != null && !apiKey.isEmpty() && !apiKey.contains("${");

        Map<String, Object> config = Map.of(
                "model", huggingFaceProperties.getModel(),
                "apiKeyConfigured", isConfigured,
                "apiUrl", huggingFaceProperties.getApi().getUrl()
        );
        return ResponseEntity.ok(config);
    }

    private String abbreviate(String s, int max) {
        if (s == null) return "(null)";
        if (s.length() <= max) return s;
        return s.substring(0, max) + "…";
    }

    private String maskKey(String key) {
        if (key == null || key.isEmpty()) return "NOT SET";
        if (key.contains("${")) return "UNRESOLVED PLACEHOLDER";
        if (key.length() <= 10) return "***";
        return key.substring(0, 8) + "..." + key.substring(key.length() - 4);
    }
}