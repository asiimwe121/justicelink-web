package lcdjp.ai;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class HuggingFaceEmbeddingService implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(HuggingFaceEmbeddingService.class);

    @Value("${huggingface.api.key:}")
    private String apiKey;

    @Value("${huggingface.embedding.model:sentence-transformers/all-MiniLM-L6-v2}")
    private String embeddingModel;

    @Value("${huggingface.embedding.api.url:https://router.huggingface.co/hf-inference/models/}")
    private String embeddingBaseUrl;

    /** One attempt gives up after this long (was 20s read; with three retries one lookup could hold a thread over a minute). */
    private static final Duration ATTEMPT_TIMEOUT = Duration.ofSeconds(10);

    /** No new attempt starts after this long, so one chat lookup cannot hold a thread for a minute. */
    private static final long TIME_LIMIT_MILLIS = 15_000L;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OutboundHttp http;

    public HuggingFaceEmbeddingService() {
        // Retries transient failures (5xx, 429, timeouts) with jittered backoff and stops calling
        // HuggingFace for a while after repeated failures. A 4xx is a rejection and is not retried.
        this(new OutboundHttp("huggingface-embeddings", OutboundGuard.withRetries("huggingface-embeddings")));
    }

    HuggingFaceEmbeddingService(OutboundHttp http) {
        this.http = http;
    }

    @Override
    public List<Float> embed(String text) throws Exception {
        if (apiKey == null || apiKey.isBlank() || apiKey.contains("${")) {
            throw new IllegalStateException("HUGGINGFACE_API_KEY is not configured — cannot generate embeddings");
        }
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Cannot embed empty text");
        }

        String url = embeddingBaseUrl + embeddingModel + "/pipeline/feature-extraction";

        Map<String, Object> body = Map.of(
                "inputs", text,
                "options", Map.of("wait_for_model", true)
        );

        OutboundHttp.Response response = http.postJson(
                url,
                Map.of("Accept", "application/json", "Authorization", "Bearer " + apiKey),
                objectMapper.writeValueAsString(body),
                ATTEMPT_TIMEOUT,
                TIME_LIMIT_MILLIS);

        String rawBody = response.body();
        if (rawBody.isBlank()) {
            throw new IllegalStateException("HuggingFace embedding call returned an empty body (HTTP " + response.status() + ")");
        }

        Object parsed;
        try {

            parsed = objectMapper.readValue(rawBody, Object.class);
        } catch (Exception e) {
            throw new IllegalStateException("HuggingFace embedding response was not valid JSON: " + truncate(rawBody), e);
        }

        List<Float> result = flattenToVector(parsed);
        if (result.isEmpty()) {
            throw new IllegalStateException("HuggingFace embedding response had no vector values");
        }
        return result;
    }

    private String truncate(String s) {
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }

    @SuppressWarnings("unchecked")
    private List<Float> flattenToVector(Object raw) {
        if (!(raw instanceof List<?> outer) || outer.isEmpty()) {
            return List.of();
        }

        Object first = outer.get(0);
        if (first instanceof Number) {

            List<Float> result = new ArrayList<>(outer.size());
            for (Object n : outer) {
                result.add(((Number) n).floatValue());
            }
            return result;
        }

        if (first instanceof List<?> firstRow && !firstRow.isEmpty() && firstRow.get(0) instanceof Number) {

            int dims = firstRow.size();
            double[] sums = new double[dims];
            int tokenCount = 0;
            for (Object rowObj : outer) {
                List<Number> row = (List<Number>) rowObj;
                for (int i = 0; i < dims && i < row.size(); i++) {
                    sums[i] += row.get(i).doubleValue();
                }
                tokenCount++;
            }
            List<Float> result = new ArrayList<>(dims);
            for (double sum : sums) {
                result.add((float) (sum / Math.max(tokenCount, 1)));
            }
            return result;
        }

        if (first instanceof List<?> nestedOnce) {

            return flattenToVector(nestedOnce);
        }

        log.warn("[HuggingFace] Unrecognized embedding response shape");
        return List.of();
    }
}
