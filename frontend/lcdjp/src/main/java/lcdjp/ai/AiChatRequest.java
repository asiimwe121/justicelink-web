package lcdjp.ai;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;
import java.util.Map;

public class AiChatRequest {
    static final int MAX_HISTORY_TURNS = 12;
    static final int MAX_TURN_CHARS = 1500;
    static final int MAX_MESSAGE_CHARS = 4000;

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
    public void setMessage(String message) {
        this.message = (message != null && message.length() > MAX_MESSAGE_CHARS)
                ? message.substring(0, MAX_MESSAGE_CHARS) : message;
    }
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
