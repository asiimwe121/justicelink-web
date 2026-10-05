package lcdjp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
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

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public HuggingFaceEmbeddingService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(20000);
        this.restTemplate = new RestTemplate(factory);

        this.restTemplate.getInterceptors().add(new ContentTypeSanitizingInterceptor());
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

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        String rawBody = response.getBody();
        if (!response.getStatusCode().is2xxSuccessful() || rawBody == null || rawBody.isBlank()) {
            throw new IllegalStateException("HuggingFace embedding call failed: " + response.getStatusCode()
                    + (rawBody != null && !rawBody.isBlank() ? " — " + truncate(rawBody) : ""));
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

    private static final class ContentTypeSanitizingInterceptor implements ClientHttpRequestInterceptor {
        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
                throws IOException {
            return new SanitizedClientHttpResponse(execution.execute(request, body));
        }
    }

    private static final class SanitizedClientHttpResponse implements ClientHttpResponse {
        private final ClientHttpResponse delegate;
        private HttpHeaders sanitizedHeaders;

        SanitizedClientHttpResponse(ClientHttpResponse delegate) {
            this.delegate = delegate;
        }

        @Override
        public HttpHeaders getHeaders() {
            if (sanitizedHeaders == null) {
                HttpHeaders original = delegate.getHeaders();
                HttpHeaders fixed = new HttpHeaders();
                fixed.addAll(original);

                List<String> contentType = original.get(HttpHeaders.CONTENT_TYPE);
                if (contentType != null && !contentType.isEmpty() && contentType.get(0) != null
                        && contentType.get(0).contains(",")) {
                    String raw = contentType.get(0);
                    String firstToken = raw.split(",")[0].trim();
                    String safeValue = firstToken.isEmpty() ? MediaType.APPLICATION_JSON_VALUE : firstToken;
                    try {
                        MediaType.parseMediaType(safeValue);
                    } catch (Exception e) {
                        safeValue = MediaType.APPLICATION_JSON_VALUE;
                    }
                    fixed.set(HttpHeaders.CONTENT_TYPE, safeValue);
                    log.warn("[HuggingFace] Response had a malformed Content-Type header ('{}') — "
                            + "normalized to '{}'", raw, safeValue);
                }
                sanitizedHeaders = fixed;
            }
            return sanitizedHeaders;
        }

        @Override
        public InputStream getBody() throws IOException {
            return delegate.getBody();
        }

        @Override
        public HttpStatusCode getStatusCode() throws IOException {
            return delegate.getStatusCode();
        }

        @Override
        public String getStatusText() throws IOException {
            return delegate.getStatusText();
        }

        @Override
        public void close() {
            delegate.close();
        }
    }
}
