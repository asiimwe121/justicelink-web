package lcdjp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Machine translation of English interface text into the five Ugandan languages the app offers.
 * Backed by the Sunbird AI translation API, which (unlike Google Cloud Translation) covers
 * Luganda, Acholi, Ateso, Lugbara and Runyankore. The API token stays on the server.
 */
@Service
public class TranslationService {

    private static final Logger log = LoggerFactory.getLogger(TranslationService.class);

    /** Language codes the front-end language picker uses; identical to Sunbird's ISO 639-3 codes. */
    static final Set<String> SUPPORTED = Set.of("lug", "ach", "teo", "lgg", "nyn");

    static final int MAX_CHARS_PER_CALL = 500;
    private static final int SHORT_TEXT_CHARS = 80;
    private static final long AUTH_LOG_INTERVAL_MS = 60_000L;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String token;
    private final String url;
    private final boolean enabled;
    private final Cache<String, String> cache;
    private final ExecutorService executor;
    private volatile long lastAuthErrorLogged = 0L;

    @Autowired
    public TranslationService(
            @Value("${app.translation.sunbird.token:}") String token,
            @Value("${app.translation.sunbird.url:https://api.sunbird.ai/tasks/translate}") String url,
            @Value("${app.translation.enabled:true}") boolean enabled,
            @Value("${app.translation.cache-max-entries:20000}") long cacheMaxEntries,
            @Value("${app.translation.cache-ttl-hours:24}") long cacheTtlHours,
            @Value("${app.translation.parallelism:4}") int parallelism) {
        this(newRestTemplate(), token, url, enabled, cacheMaxEntries, cacheTtlHours, parallelism);
    }

    TranslationService(RestTemplate restTemplate, String token, String url, boolean enabled,
                       long cacheMaxEntries, long cacheTtlHours, int parallelism) {
        this.restTemplate = restTemplate;
        this.token = token == null ? "" : token.trim();
        this.url = url;
        this.enabled = enabled;
        this.cache = Caffeine.newBuilder()
                .maximumSize(Math.max(100, cacheMaxEntries))
                .expireAfterWrite(Duration.ofHours(Math.max(1, cacheTtlHours)))
                .build();
        this.executor = Executors.newFixedThreadPool(Math.max(1, parallelism), runnable -> {
            Thread t = new Thread(runnable, "translation-worker");
            t.setDaemon(true);
            return t;
        });
    }

    private static RestTemplate newRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(20000);
        return new RestTemplate(factory);
    }

    public static boolean isSupported(String language) {
        return language != null && SUPPORTED.contains(language);
    }

    public boolean isAvailable() {
        return enabled && !token.isEmpty() && !token.contains("${");
    }

    /**
     * Translates each text into {@code target}. The result has the same size and order as the
     * input; an entry is {@code null} when that text could not be translated, so the caller can
     * leave the original English on screen.
     */
    public List<String> translate(List<String> texts, String target) {
        List<String> result = new ArrayList<>(texts.size());
        for (int i = 0; i < texts.size(); i++) {
            result.add(null);
        }
        if (!isAvailable() || !isSupported(target)) {
            return result;
        }

        Map<String, CompletableFuture<String>> pending = new LinkedHashMap<>();
        for (String text : texts) {
            if (text == null || text.isBlank()) {
                continue;
            }
            String key = cacheKey(target, text);
            if (cache.getIfPresent(key) == null && !pending.containsKey(text)) {
                pending.put(text, CompletableFuture.supplyAsync(() -> translateOne(text, target), executor));
            }
        }

        Map<String, String> fresh = new HashMap<>();
        for (Map.Entry<String, CompletableFuture<String>> entry : pending.entrySet()) {
            try {
                String translated = entry.getValue().get(30, TimeUnit.SECONDS);
                if (translated != null) {
                    fresh.put(entry.getKey(), translated);
                    cache.put(cacheKey(target, entry.getKey()), translated);
                }
            } catch (Exception e) {
                entry.getValue().cancel(true);
                log.warn("[translate] gave up on one text ({}): {}", target, e.getMessage());
            }
        }

        for (int i = 0; i < texts.size(); i++) {
            String text = texts.get(i);
            if (text == null || text.isBlank()) {
                continue;
            }
            String cached = cache.getIfPresent(cacheKey(target, text));
            result.set(i, cached != null ? cached : fresh.get(text));
        }
        return result;
    }

    private String translateOne(String text, String target) {
        try {
            String source = text.length() <= SHORT_TEXT_CHARS ? "eng" : null;
            StringBuilder out = new StringBuilder();
            for (String chunk : splitIntoChunks(text)) {
                String piece = callSunbird(chunk, source, target);
                if (piece == null) {
                    return null;
                }
                if (out.length() > 0) {
                    out.append(' ');
                }
                out.append(piece);
            }
            String finished = out.toString().trim();
            return finished.isEmpty() ? null : finished;
        } catch (Exception e) {
            log.warn("[translate] request failed ({}): {}", target, e.getMessage());
            return null;
        }
    }

    private String callSunbird(String text, String source, String target) throws Exception {
        Map<String, Object> body = new HashMap<>();
        if (source != null) {
            body.put("source_language", source);
        }
        body.put("target_language", target);
        body.put("text", text);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(token);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            String raw = response.getBody();
            if (!response.getStatusCode().is2xxSuccessful() || raw == null || raw.isBlank()) {
                return null;
            }
            return extractTranslation(objectMapper.readTree(raw));
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            if (status == 401 || status == 403) {
                long now = System.currentTimeMillis();
                if (now - lastAuthErrorLogged > AUTH_LOG_INTERVAL_MS) {
                    lastAuthErrorLogged = now;
                    log.error("[translate] Sunbird rejected the API token (HTTP {}). "
                            + "Generate a new token and update SUNBIRD_API_TOKEN.", status);
                }
            } else {
                log.warn("[translate] Sunbird returned HTTP {}", status);
            }
            return null;
        }
    }

    static String extractTranslation(JsonNode root) {
        if (root == null) {
            return null;
        }
        JsonNode output = root.has("output") ? root.get("output") : root;
        for (String field : new String[] {"translated_text", "text"}) {
            JsonNode node = output.get(field);
            if (node != null && node.isTextual() && !node.asText().isBlank()) {
                return node.asText().trim();
            }
        }
        return null;
    }

    /** Splits long text on sentence boundaries so each call stays under MAX_CHARS_PER_CALL. */
    static List<String> splitIntoChunks(String text) {
        List<String> chunks = new ArrayList<>();
        String trimmed = text.trim();
        if (trimmed.length() <= MAX_CHARS_PER_CALL) {
            chunks.add(trimmed);
            return chunks;
        }
        StringBuilder current = new StringBuilder();
        for (String sentence : trimmed.split("(?<=[.!?])\\s+")) {
            while (sentence.length() > MAX_CHARS_PER_CALL) {
                int cut = sentence.lastIndexOf(' ', MAX_CHARS_PER_CALL);
                if (cut <= 0) {
                    cut = MAX_CHARS_PER_CALL;
                }
                if (current.length() > 0) {
                    chunks.add(current.toString());
                    current.setLength(0);
                }
                chunks.add(sentence.substring(0, cut).trim());
                sentence = sentence.substring(cut).trim();
            }
            if (current.length() + sentence.length() + 1 > MAX_CHARS_PER_CALL && current.length() > 0) {
                chunks.add(current.toString());
                current.setLength(0);
            }
            if (current.length() > 0) {
                current.append(' ');
            }
            current.append(sentence);
        }
        if (current.length() > 0) {
            chunks.add(current.toString());
        }
        return chunks;
    }

    private static String cacheKey(String target, String text) {
        return target + '\u0000' + text;
    }
}
