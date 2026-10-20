package lcdjp.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The chat provider the rest of the app uses. Tries the configured AI providers in order (app.ai.providers, from
 * AI_PROVIDERS in .env, e.g. "groq,gemini") and returns the first real reply. A provider with no API key is skipped.
 * Returns null only when every provider failed, which callers already turn into the friendly fallback reply.
 */
@Service
public class FailoverChatProvider implements AiChatProvider {

    private static final Logger log = LoggerFactory.getLogger(FailoverChatProvider.class);

    private final List<ChatBackend> chain;

    @Autowired
    public FailoverChatProvider(List<ChatBackend> backends,
                                @Value("${app.ai.providers:groq,gemini}") String order) {
        this(orderedChain(backends, order));
    }

    FailoverChatProvider(List<ChatBackend> chain) {
        this.chain = List.copyOf(chain);
    }

    /** Picks the providers named in {@code csv}, in that order. Unknown names are ignored; an empty result uses all. */
    static List<ChatBackend> orderedChain(List<ChatBackend> all, String csv) {
        Map<String, ChatBackend> byName = new LinkedHashMap<>();
        for (ChatBackend b : all) {
            byName.put(b.name().toLowerCase(Locale.ROOT), b);
        }
        List<ChatBackend> out = new ArrayList<>();
        if (csv != null) {
            for (String raw : csv.split(",")) {
                String n = raw.trim().toLowerCase(Locale.ROOT);
                if (n.isEmpty()) continue;
                ChatBackend b = byName.get(n);
                if (b == null) {
                    log.warn("[AI] Unknown provider '{}' in app.ai.providers (known: {})", n, byName.keySet());
                } else if (!out.contains(b)) {
                    out.add(b);
                }
            }
        }
        if (out.isEmpty()) {
            log.warn("[AI] app.ai.providers named no known provider; using all of: {}", byName.keySet());
            out.addAll(byName.values());
        }
        return out;
    }

    @Override
    public String chat(AiChatRequest request) {
        boolean anyConfigured = false;
        for (int i = 0; i < chain.size(); i++) {
            ChatBackend backend = chain.get(i);
            if (!backend.isConfigured()) {
                continue;
            }
            anyConfigured = true;
            String reply = null;
            try {
                reply = backend.chat(request);
            } catch (RuntimeException e) {
                log.error("[AI] {} threw {}; treating it as no reply", backend.name(), e.toString());
            }
            if (reply != null && !reply.isBlank()) {
                log.info("[AI] Reply provided by {} ({})", backend.name(), backend.model());
                return reply;
            }
            if (hasLaterConfigured(i)) {
                log.warn("[AI] {} gave no reply; failing over to the next provider", backend.name());
            }
        }
        if (!anyConfigured) {
            log.error("[AI] No chat provider is configured (set GROQ_API_KEY and/or GEMINI_API_KEY)");
        } else {
            log.warn("[AI] Every configured provider failed; the caller will use its fallback reply");
        }
        return null;
    }

    private boolean hasLaterConfigured(int index) {
        for (int j = index + 1; j < chain.size(); j++) {
            if (chain.get(j).isConfigured()) return true;
        }
        return false;
    }

    /** First provider in the order (the one tried first), or null if there are none. */
    ChatBackend primary() {
        return chain.isEmpty() ? null : chain.get(0);
    }

    boolean anyConfigured() {
        return chain.stream().anyMatch(ChatBackend::isConfigured);
    }

    String chainNames() {
        return chain.stream().map(ChatBackend::name).collect(Collectors.joining(" -> "));
    }

    /** For the health endpoint: no keys, only whether each provider has one. */
    List<Map<String, Object>> status() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (ChatBackend b : chain) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", b.name());
            m.put("model", b.model());
            m.put("apiKeyConfigured", b.isConfigured());
            out.add(m);
        }
        return out;
    }
}
