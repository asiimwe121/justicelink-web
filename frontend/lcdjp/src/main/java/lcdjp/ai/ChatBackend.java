package lcdjp.ai;

/**
 * One AI chat provider (Groq, Gemini, ...). {@link FailoverChatProvider} tries them in order.
 * {@link #chat} returns null when the provider could not answer; it never throws.
 */
public interface ChatBackend {

    /** Short lower-case id used in AI_PROVIDERS, e.g. "groq". */
    String name();

    String model();

    /** True when an API key is present, so the provider is worth trying. */
    boolean isConfigured();

    String chat(AiChatRequest request);
}
