package lcdjp.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Chat provider settings (Groq, OpenAI-compatible). Embeddings for RAG still use Hugging Face and are
 * configured separately under huggingface.embedding.* (see HuggingFaceEmbeddingService).
 */
@Component
@ConfigurationProperties(prefix = "groq")
public class GroqProperties {
    private String model = "llama-3.3-70b-versatile";
    private Api api = new Api();
    private int timeoutSeconds = 25;

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Api getApi() { return api; }
    public void setApi(Api api) { this.api = api; }
    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public static class Api {
        private String key;

        private String url = "https://api.groq.com/openai/v1/chat/completions";

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }
}
