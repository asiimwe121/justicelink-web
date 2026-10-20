package lcdjp.ai;

import lcdjp.common.Bulkhead;
import lcdjp.common.OutboundHttp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chat client for any provider that speaks the OpenAI "chat completions" format (Groq, Gemini's OpenAI-compatible
 * endpoint, ...). A subclass only supplies its key, URL, model and timeout.
 */
public abstract class OpenAiCompatChatService implements ChatBackend {

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    protected final Logger log = LoggerFactory.getLogger(getClass());

    private final String name;
    private final String label;
    private final OutboundHttp http;
    private AiSpendGuard spendGuard;

    /**
     * Caps how many request threads can be waiting on this provider at once. A slow provider would
     * otherwise tie up every Tomcat thread and the whole site would stop answering.
     */
    private volatile Bulkhead bulkhead;

    protected OpenAiCompatChatService(String name, OutboundHttp http) {
        this.name = name;
        this.label = Character.toUpperCase(name.charAt(0)) + name.substring(1);
        this.http = http;
        this.bulkhead = new Bulkhead("ai-chat-" + name, 8);
    }

    protected abstract String apiKey();

    protected abstract String apiUrl();

    protected abstract int timeoutSeconds();

    /** Hook for provider-specific request fields. */
    protected void extendBody(Map<String, Object> body) {
    }

    @org.springframework.beans.factory.annotation.Value("${app.ai.max-concurrent:8}")
    void setMaxConcurrent(int maxConcurrent) {
        this.bulkhead = new Bulkhead("ai-chat-" + name, Math.max(1, maxConcurrent));
    }

    Bulkhead bulkhead() {
        return bulkhead;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setSpendGuard(AiSpendGuard spendGuard) {
        this.spendGuard = spendGuard;
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public boolean isConfigured() {
        String key = apiKey();
        return key != null && !key.isBlank() && !key.contains("${");
    }

    @Override
    public String chat(AiChatRequest request) {
        Bulkhead gate = bulkhead;
        if (!gate.tryAcquire()) {
            // Callers already turn null into the friendly fallback reply (or the next provider).
            log.warn("[{}] {} chat calls already in flight; returning no reply", label, gate.inFlight());
            return null;
        }
        try {
            return callProvider(request);
        } finally {
            gate.release();
        }
    }

    private String callProvider(AiChatRequest request) {
        try {
            List<Map<String, String>> messages = buildMessages(request);

            String apiKey = apiKey();
            String url = apiUrl();

            log.info("[{}] Calling {} with model: {}", label, url, model());
            log.info("[{}] API Key status: {}", label, isConfigured() ? "✅ Configured" : "❌ Not configured");

            if (!isConfigured()) {
                log.error("[{}] API key is not properly configured!", label);
                return null;
            }

            int maxTokens = request.getMaxTokens() != null ? request.getMaxTokens() : 700;
            double temperature = request.getTemperature() != null ? request.getTemperature() : 0.7;

            if (spendGuard != null) {
                int promptChars = messages.stream().mapToInt(m -> m.getOrDefault("content", "").length()).sum();
                if (!spendGuard.tryReserve(promptChars, maxTokens)) {
                    return null; // callers already turn null into the friendly fallback reply
                }
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model());
            body.put("messages", messages);
            body.put("max_tokens", maxTokens);
            body.put("temperature", temperature);
            extendBody(body);

            // Non-2xx answers surface as exceptions from OutboundHttp and end up in the catch below (null reply).
            OutboundHttp.Response response = http.postJson(
                    url,
                    Map.of("Authorization", "Bearer " + apiKey, "Accept", "application/json"),
                    MAPPER.writeValueAsString(body),
                    Duration.ofSeconds(Math.max(1, timeoutSeconds())));

            Map<?, ?> parsed = response.body().isBlank() ? null : MAPPER.readValue(response.body(), Map.class);
            if (parsed == null) {
                log.warn("[{}] Empty response body", label);
                return null;
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) parsed.get("choices");
            if (choices == null || choices.isEmpty()) {
                log.warn("[{}] No choices in response", label);
                return null;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String reply = message != null ? (String) message.get("content") : null;

            if (reply == null || reply.isBlank()) {
                log.warn("[{}] Empty reply from API", label);
                return null;
            }

            log.info("[{}] Reply received ({} chars)", label, reply.length());
            return reply.trim();

        } catch (Exception e) {
            log.error("[{}] API call failed: {}", label, e.getMessage());
            log.debug("[{}] failure detail", label, e);
            return null;
        }
    }

    private List<Map<String, String>> buildMessages(AiChatRequest req) {
        List<Map<String, String>> messages = new ArrayList<>();

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
