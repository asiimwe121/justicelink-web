package lcdjp.legal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Human-reviewed legal glossary. Machine translation of legal terms is unreliable, so an exact
 * match against a term whose translation a person has marked reviewed replaces the machine call.
 * Entries that are unreviewed or empty are never applied.
 *
 * Source: classpath:glossary/legal-glossary.json, or the file named by app.glossary.path
 * (so reviewers can update terms without a rebuild).
 */
@Service
public class GlossaryService {

    private static final Logger log = LoggerFactory.getLogger(GlossaryService.class);

    /** language -> normalised English term -> reviewed translation */
    private volatile Map<String, Map<String, String>> reviewed = Map.of();
    private volatile int unreviewedCount = 0;

    private final String externalPath;

    @Autowired
    public GlossaryService(@Value("${app.glossary.path:}") String externalPath) {
        this.externalPath = externalPath == null ? "" : externalPath.trim();
        reload();
    }

    /** Test hook: load straight from a JSON string. */
    GlossaryService(String json, boolean fromJson) {
        this.externalPath = "";
        load(json);
    }

    public final void reload() {
        try {
            String json;
            if (!externalPath.isEmpty() && Files.isReadable(Path.of(externalPath))) {
                json = Files.readString(Path.of(externalPath));
            } else {
                try (InputStream in = getClass().getResourceAsStream("/glossary/legal-glossary.json")) {
                    if (in == null) {
                        log.warn("[glossary] no glossary file found; machine translation is used as is");
                        return;
                    }
                    json = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }
            }
            load(json);
        } catch (Exception e) {
            log.error("[glossary] could not load glossary: {}", e.getMessage());
        }
    }

    private void load(String json) {
        try {
            JsonNode root = new ObjectMapper().readTree(json);
            Map<String, Map<String, String>> next = new HashMap<>();
            int pending = 0;
            for (JsonNode term : root.path("terms")) {
                String en = normalise(term.path("en").asText(""));
                if (en.isEmpty()) {
                    continue;
                }
                for (Map.Entry<String, JsonNode> entry : term.path("translations").properties()) {
                    String text = entry.getValue().path("text").asText("").trim();
                    boolean ok = entry.getValue().path("reviewed").asBoolean(false);
                    if (ok && !text.isEmpty()) {
                        next.computeIfAbsent(entry.getKey(), k -> new HashMap<>()).put(en, text);
                    } else {
                        pending++;
                    }
                }
            }
            this.reviewed = next;
            this.unreviewedCount = pending;
            log.info("[glossary] loaded {} reviewed translation(s); {} slot(s) awaiting review",
                    next.values().stream().mapToInt(Map::size).sum(), pending);
        } catch (Exception e) {
            log.error("[glossary] invalid glossary JSON, keeping previous data: {}", e.getMessage());
        }
    }

    /** Reviewed translation for an exact (case-insensitive, trimmed) match, if one exists. */
    public Optional<String> lookup(String englishText, String language) {
        if (englishText == null || language == null) {
            return Optional.empty();
        }
        Map<String, String> forLang = reviewed.get(language);
        if (forLang == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(forLang.get(normalise(englishText)));
    }

    public int unreviewedSlots() {
        return unreviewedCount;
    }

    private static String normalise(String s) {
        return s.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
