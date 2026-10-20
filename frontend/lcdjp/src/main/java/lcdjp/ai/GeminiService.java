package lcdjp.ai;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Google Gemini through its OpenAI-compatible chat endpoint. Used as a failover behind Groq. */
@Service
public class GeminiService extends OpenAiCompatChatService {

    private final GeminiProperties props;

    @org.springframework.beans.factory.annotation.Autowired
    public GeminiService(GeminiProperties props) {
        this(props, new OutboundHttp("gemini-chat", OutboundGuard.noRetry("gemini-chat")));
    }

    GeminiService(GeminiProperties props, OutboundHttp http) {
        super("gemini", http);
        this.props = props;
    }

    @Override
    public String model() {
        return props.getModel();
    }

    @Override
    protected String apiKey() {
        return props.getApi().getKey();
    }

    @Override
    protected String apiUrl() {
        return props.getApi().getUrl();
    }

    @Override
    protected int timeoutSeconds() {
        return props.getTimeoutSeconds();
    }

    @Override
    protected void extendBody(Map<String, Object> body) {
        // Optional. Thinking models count their hidden reasoning against max_tokens; "low" keeps room for the reply.
        String effort = props.getReasoningEffort();
        if (effort != null && !effort.isBlank()) {
            body.put("reasoning_effort", effort.trim());
        }
    }
}
