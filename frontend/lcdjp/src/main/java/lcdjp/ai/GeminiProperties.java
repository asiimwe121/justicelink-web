package lcdjp.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Gemini chat settings (OpenAI-compatible endpoint). Backup provider behind Groq. */
@Component
@ConfigurationProperties(prefix = "gemini")
public class GeminiProperties {
    private String model = "gemini-3.5-flash-lite";
    private Api api = new Api();
    private int timeoutSeconds = 25;
    /** Optional (low / medium / high). Empty = not sent. */
    private String reasoningEffort = "";

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Api getApi() { return api; }
    public void setApi(Api api) { this.api = api; }
    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }
    public String getReasoningEffort() { return reasoningEffort; }
    public void setReasoningEffort(String reasoningEffort) { this.reasoningEffort = reasoningEffort; }

    public static class Api {
        private String key;

        private String url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }
}
