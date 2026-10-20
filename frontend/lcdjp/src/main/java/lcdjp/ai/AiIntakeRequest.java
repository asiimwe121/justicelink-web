package lcdjp.ai;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class AiIntakeRequest {
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
