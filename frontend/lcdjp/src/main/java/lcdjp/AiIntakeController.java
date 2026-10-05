package lcdjp;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AiIntakeRequest {
    private static final int MAX_MESSAGE_CHARS = 4000;
    private static final int MAX_VALUE_CHARS = 500;

    private String message;
    private String category = "Incident";
    private Map<String, String> answers = new LinkedHashMap<>();
    private List<String> pendingKeys = new ArrayList<>();
    private List<AiChatTurn> history = new ArrayList<>();
    private String sessionId;

    public String getMessage() { return message; }
    public void setMessage(String message) {
        this.message = message == null ? null
                : (message.length() > MAX_MESSAGE_CHARS ? message.substring(0, MAX_MESSAGE_CHARS) : message);
    }

    public String getCategory() { return category; }
    public void setCategory(String category) {
        if (category == null || category.isBlank()) return;
        this.category = category.length() > 100 ? category.substring(0, 100) : category;
    }

    public Map<String, String> getAnswers() { return answers; }
    public void setAnswers(Map<String, Object> answers) {
        Map<String, String> clean = new LinkedHashMap<>();
        if (answers != null) {
            for (Map.Entry<String, Object> e : answers.entrySet()) {
                if (!AiIntakeService.FIELD_KEYS.contains(e.getKey()) || !(e.getValue() instanceof String)) continue;
                String v = ((String) e.getValue()).trim();
                if (v.isEmpty()) continue;
                clean.put(e.getKey(), v.length() > MAX_VALUE_CHARS ? v.substring(0, MAX_VALUE_CHARS) : v);
            }
        }
        this.answers = clean;
    }

    public List<String> getPendingKeys() { return pendingKeys; }
    public void setPendingKeys(List<String> pendingKeys) {
        this.pendingKeys = pendingKeys == null ? new ArrayList<>() : new ArrayList<>(pendingKeys);
    }

    public List<AiChatTurn> getHistory() { return history; }
    public void setHistory(List<AiChatTurn> history) {
        // Reuse AiChatRequest's sanitising (role whitelist, length caps, most recent turns only).
        AiChatRequest tmp = new AiChatRequest();
        tmp.setHistory(history);
        this.history = tmp.getHistory();
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}

class AiIntakeResponse {
    private String intent = "OTHER";
    private Map<String, String> extracted = new LinkedHashMap<>();
    private String reply;
    private boolean fallback;
    private boolean legalRagUsed;
    private List<LegalSourceReference> sources = new ArrayList<>();

    static AiIntakeResponse fallback() {
        AiIntakeResponse r = new AiIntakeResponse();
        r.fallback = true;
        return r;
    }

    public String getIntent() { return intent; }
    public void setIntent(String intent) { this.intent = intent; }
    public Map<String, String> getExtracted() { return extracted; }
    public void setExtracted(Map<String, String> extracted) { this.extracted = extracted; }
    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
    public boolean isFallback() { return fallback; }
    public void setFallback(boolean fallback) { this.fallback = fallback; }
    public boolean isLegalRagUsed() { return legalRagUsed; }
    public void setLegalRagUsed(boolean legalRagUsed) { this.legalRagUsed = legalRagUsed; }
    public List<LegalSourceReference> getSources() { return sources; }
    public void setSources(List<LegalSourceReference> sources) { this.sources = sources; }
}

@RestController
@RequestMapping("/api/ai")
public class AiIntakeController {

    private final AiIntakeService intakeService;

    public AiIntakeController(AiIntakeService intakeService) {
        this.intakeService = intakeService;
    }

    @PostMapping("/intake")
    @RateLimited(limit = 15, durationMinutes = 1)
    public ResponseEntity<AiIntakeResponse> intake(@RequestBody AiIntakeRequest request) {
        return ResponseEntity.ok(intakeService.handle(request));
    }
}
