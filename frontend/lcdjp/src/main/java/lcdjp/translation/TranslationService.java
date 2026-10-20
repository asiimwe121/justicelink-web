package lcdjp.translation;

import lcdjp.common.Bulkhead;
import lcdjp.legal.GlossaryService;
import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import lcdjp.common.TransientProviderException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

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
    static final int DEFAULT_MAX_CONCURRENT = 6;
    static final int DEFAULT_QUEUE_CAPACITY = 100;
    private static final int SHORT_TEXT_CHARS = 80;
    private static final long AUTH_LOG_INTERVAL_MS = 60_000L;
    private static final Duration CALL_TIMEOUT = Duration.ofSeconds(20);

    private final OutboundHttp http;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String token;
    private final String url;
    private final boolean enabled;
    private final Cache<String, String> cache;
    private final ExecutorService executor;
    private final Bulkhead bulkhead;
    private volatile long lastAuthErrorLogged = 0L;
    private volatile GlossaryService glossary;

    /** Optional: when present, human-reviewed glossary terms replace machine output on exact match. */
    @Autowired(required = false)
    public void setGlossary(GlossaryService glossary) {
        this.glossary = glossary;
    }

    private String glossaryHit(String text, String target) {
        GlossaryService g = glossary;
        return g == null ? null : g.lookup(text, target).orElse(null);
    }

    @Autowired
    public TranslationService(
            @Value("${app.translation.sunbird.token:}") String token,
            @Value("${app.translation.sunbird.url:https://api.sunbird.ai/tasks/translate}") String url,
            @Value("${app.translation.enabled:true}") boolean enabled,
            @Value("${app.translation.cache-max-entries:20000}") long cacheMaxEntries,
            @Value("${app.translation.cache-ttl-hours:24}") long cacheTtlHours,
            @Value("${app.translation.parallelism:4}") int parallelism,
            @Value("${app.translation.max-concurrent:6}") int maxConcurrent,
            @Value("${app.translation.queue-capacity:100}") int queueCapacity) {
        this(newHttp(), token, url, enabled, cacheMaxEntries, cacheTtlHours, parallelism,
                maxConcurrent, queueCapacity);
    }

    public TranslationService(OutboundHttp http, String token, String url, boolean enabled,
                       long cacheMaxEntries, long cacheTtlHours, int parallelism) {
        this(http, token, url, enabled, cacheMaxEntries, cacheTtlHours, parallelism,
                DEFAULT_MAX_CONCURRENT, DEFAULT_QUEUE_CAPACITY);
    }

    TranslationService(OutboundHttp http, String token, String url, boolean enabled,
                       long cacheMaxEntries, long cacheTtlHours, int parallelism,
                       int maxConcurrent, int queueCapacity) {
        this.http = http;
        this.token = token == null ? "" : token.trim();
        this.url = url;
        this.enabled = enabled;
        this.cache = Caffeine.newBuilder()
                .maximumSize(Math.max(100, cacheMaxEntries))
                .expireAfterWrite(Duration.ofHours(Math.max(1, cacheTtlHours)))
                .build();
        int workers = Math.max(1, parallelism);
        // Bounded queue: with an unbounded one, a slow provider lets queued texts (and memory) pile up
        // without limit. When it is full, submit() throws and that text is skipped for this request.
        this.executor = new ThreadPoolExecutor(workers, workers, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(Math.max(1, queueCapacity)),
                runnable -> {
                    Thread t = new Thread(runnable, "translation-worker");
                    t.setDaemon(true);
                    return t;
                },
                new ThreadPoolExecutor.AbortPolicy());
        this.bulkhead = new Bulkhead("translation", Math.max(1, maxConcurrent));
    }

    /** Test hook: lets a test hold permits to simulate a busy provider. */
    Bulkhead bulkhead() {
        return bulkhead;
    }

    /** No retries (a slow translation is not worth repeating); the breaker stops calls to a dead provider. */
    private static OutboundHttp newHttp() {
        return new OutboundHttp("sunbird-translation", OutboundGuard.noRetry("sunbird-translation"));
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
        if (!isSupported(target) || (!isAvailable() && glossary == null)) {
            return result;
        }

        // Texts that really need the remote API (not blank, not in the glossary, not already cached).
        List<String> needRemote = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String text : texts) {
            if (text == null || text.isBlank()) {
                continue;
            }
            if (isAvailable() && glossaryHit(text, target) == null
                    && cache.getIfPresent(cacheKey(target, text)) == null && seen.add(text)) {
                needRemote.add(text);
            }
        }

        Map<String, String> fresh = new HashMap<>();
        if (!needRemote.isEmpty()) {
            // Cap how many requests can be inside the provider at once. Over the cap the texts come back
            // untranslated (glossary and cached texts are still served), so the page stays in English and
            // retries later instead of every request thread waiting behind a slow provider.
            if (!bulkhead.tryAcquire()) {
                log.warn("[translate] {} translation request(s) already in flight; leaving {} text(s) untranslated",
                        bulkhead.inFlight(), needRemote.size());
            } else {
                AtomicBoolean abandoned = new AtomicBoolean(false);
                try {
                    fresh = fetchRemote(needRemote, target, abandoned);
                } finally {
                    // Texts still queued or not yet started will now skip themselves.
                    abandoned.set(true);
                    bulkhead.release();
                }
            }
        }

        for (int i = 0; i < texts.size(); i++) {
            String text = texts.get(i);
            if (text == null || text.isBlank()) {
                continue;
            }
            String fromGlossary = glossaryHit(text, target);
            if (fromGlossary != null) {
                result.set(i, fromGlossary);
                continue;
            }
            String cached = cache.getIfPresent(cacheKey(target, text));
            result.set(i, cached != null ? cached : fresh.get(text));
        }
        return result;
    }

    private Map<String, String> fetchRemote(List<String> needRemote, String target, AtomicBoolean abandoned) {
        Map<String, CompletableFuture<String>> pending = new LinkedHashMap<>();
        for (String text : needRemote) {
            try {
                pending.put(text, CompletableFuture.supplyAsync(() -> translateOne(text, target, abandoned), executor));
            } catch (RejectedExecutionException e) {
                log.warn("[translate] work queue is full; skipping the remaining {} text(s) for this request",
                        needRemote.size() - pending.size());
                break;
            }
        }

        Map<String, String> fresh = new HashMap<>();
        // One overall deadline for the whole request: waiting up to 30s per text could pass the proxy's
        // 100s limit and surface as a 524 timeout. Texts not done in time stay in English and are retried later.
        final long deadlineNanos = System.nanoTime() + TimeUnit.SECONDS.toNanos(45);
        for (Map.Entry<String, CompletableFuture<String>> entry : pending.entrySet()) {
            try {
                long remaining = Math.max(1L, deadlineNanos - System.nanoTime());
                String translated = entry.getValue().get(remaining, TimeUnit.NANOSECONDS);
                if (translated != null) {
                    fresh.put(entry.getKey(), translated);
                    cache.put(cacheKey(target, entry.getKey()), translated);
                }
            } catch (Exception e) {
                // CompletableFuture.cancel does not stop a running task; the 'abandoned' flag set by the
                // caller makes queued and not-yet-started texts skip themselves instead.
                entry.getValue().cancel(true);
                log.warn("[translate] gave up on one text ({}): {}", target, e.getMessage());
            }
        }
        return fresh;
    }

    private String translateOne(String text, String target, AtomicBoolean abandoned) {
        try {
            if (abandoned.get()) {
                return null;
            }
            String source = text.length() <= SHORT_TEXT_CHARS ? "eng" : null;
            StringBuilder out = new StringBuilder();
            for (String chunk : splitIntoChunks(text)) {
                if (abandoned.get()) {
                    return null;
                }
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

    /** After Sunbird answers 429 we stop calling it for a minute instead of sending dozens of requests it will refuse. */
    private volatile long rateLimitedUntil = 0L;

    private String callSunbird(String text, String source, String target) throws Exception {
        if (System.currentTimeMillis() < rateLimitedUntil) {
            return null;
        }
        Map<String, Object> body = new HashMap<>();
        if (source != null) {
            body.put("source_language", source);
        }
        body.put("target_language", target);
        body.put("text", text);

        try {
            OutboundHttp.Response response = http.postJson(
                    url,
                    Map.of("Accept", "application/json", "Authorization", "Bearer " + token),
                    objectMapper.writeValueAsString(body),
                    CALL_TIMEOUT);
            String raw = response.body();
            if (raw.isBlank()) {
                return null;
            }
            return extractTranslation(objectMapper.readTree(raw));
        } catch (OutboundGuard.CircuitOpenException e) {
            return null; // Sunbird is failing; skip quietly until the breaker closes
        } catch (ProviderRejectedException e) {
            int status = e.getStatus();
            if (status == 401 || status == 403) {
                long now = System.currentTimeMillis();
                if (now - lastAuthErrorLogged > AUTH_LOG_INTERVAL_MS) {
                    lastAuthErrorLogged = now;
                    log.error("[translate] Sunbird rejected the API token (HTTP {}). "
                            + "Generate a new token and update SUNBIRD_API_TOKEN.", status);
                }
            } else {
                log.warn("[translate] Sunbird refused the request (HTTP {})", status);
            }
            return null;
        } catch (TransientProviderException e) {
            if (e.getStatus() == 429) {
                rateLimitedUntil = System.currentTimeMillis() + 60_000L;
                log.warn("[translate] Sunbird returned HTTP 429; pausing translation calls for 60 seconds");
            } else {
                log.warn("[translate] Sunbird returned HTTP {}", e.getStatus());
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
