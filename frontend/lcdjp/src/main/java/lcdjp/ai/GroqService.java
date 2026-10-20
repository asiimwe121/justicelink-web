package lcdjp.ai;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import org.springframework.stereotype.Service;

@Service
public class GroqService extends OpenAiCompatChatService {

    private final GroqProperties props;

    @org.springframework.beans.factory.annotation.Autowired
    public GroqService(GroqProperties props) {
        // No retries: a chat call is slow and costs tokens. The circuit breaker stops the site waiting on a dead provider.
        this(props, new OutboundHttp("groq-chat", OutboundGuard.noRetry("groq-chat")));
    }

    GroqService(GroqProperties props, OutboundHttp http) {
        super("groq", http);
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
}
