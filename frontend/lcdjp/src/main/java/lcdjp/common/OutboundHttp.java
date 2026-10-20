package lcdjp.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The one way the app calls an external HTTP service. It wraps the JDK HttpClient with explicit
 * timeouts and a per-provider {@link OutboundGuard} (circuit breaker, and retries where the caller's
 * guard allows them), and treats HTTP statuses the same way everywhere:
 *
 * <ul>
 *   <li>2xx and 3xx: returned normally.</li>
 *   <li>408, 425, 429 and 5xx: {@link TransientProviderException}; retried only if the guard retries,
 *       and counted toward opening the circuit.</li>
 *   <li>any other 4xx: {@link ProviderRejectedException}; never retried, never counted.</li>
 *   <li>connection failures and timeouts: the underlying {@link IOException}; counted like transient failures.</li>
 * </ul>
 *
 * A call can also carry an overall time limit after which no new attempt starts.
 */
public class OutboundHttp {

    private static final Logger log = LoggerFactory.getLogger(OutboundHttp.class);
    private static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final int BODY_SNIPPET_CHARS = 500;

    /** Status and body of a successful (2xx or 3xx) response. */
    public static final class Response {
        private final int status;
        private final String body;

        public Response(int status, String body) {
            this.status = status;
            this.body = body == null ? "" : body;
        }

        public int status() {
            return status;
        }

        public String body() {
            return body;
        }
    }

    private final String provider;
    private final OutboundGuard guard;
    private final HttpClient client;

    public OutboundHttp(String provider, OutboundGuard guard) {
        this(provider, guard, HttpClient.newBuilder().connectTimeout(DEFAULT_CONNECT_TIMEOUT).build());
    }

    OutboundHttp(String provider, OutboundGuard guard, HttpClient client) {
        this.provider = provider;
        this.guard = guard;
        this.client = client;
    }

    public String provider() {
        return provider;
    }

    /** True while the circuit for this provider is open (calls fail fast). Useful for health views. */
    public boolean isCircuitOpen() {
        return guard.isOpen();
    }

    public Response get(String url, Map<String, String> headers, Duration timeout) throws Exception {
        return get(url, headers, timeout, 0L);
    }

    public Response get(String url, Map<String, String> headers, Duration timeout, long timeLimitMillis) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(timeout).GET();
        return execute(builder, headers, timeLimitMillis);
    }

    public Response postJson(String url, Map<String, String> headers, String jsonBody, Duration timeout) throws Exception {
        return postJson(url, headers, jsonBody, timeout, 0L);
    }

    public Response postJson(String url, Map<String, String> headers, String jsonBody, Duration timeout,
                             long timeLimitMillis) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(timeout)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8));
        return execute(builder, headers, timeLimitMillis);
    }

    public Response postForm(String url, Map<String, String> headers, Map<String, String> form, Duration timeout) throws Exception {
        String body = form.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(timeout)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        return execute(builder, headers, 0L);
    }

    private Response execute(HttpRequest.Builder builder, Map<String, String> headers, long timeLimitMillis) throws Exception {
        if (headers != null) {
            headers.forEach(builder::header);
        }
        HttpRequest request = builder.build();
        return guard.call(() -> sendOnce(request), timeLimitMillis);
    }

    private Response sendOnce(HttpRequest request) throws IOException, InterruptedException {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        int status = response.statusCode();
        String body = response.body() == null ? "" : response.body();
        if (status >= 200 && status < 400) {
            return new Response(status, body);
        }
        String snippet = body.length() > BODY_SNIPPET_CHARS ? body.substring(0, BODY_SNIPPET_CHARS) + "..." : body;
        if (isTransient(status)) {
            long retryAfter = response.headers().firstValue("Retry-After").map(OutboundHttp::parseRetryAfterMillis).orElse(0L);
            log.warn("[{}] HTTP {} (provider unavailable)", provider, status);
            throw new TransientProviderException(provider + " returned HTTP " + status + ": " + snippet,
                    status, body, retryAfter);
        }
        log.warn("[{}] HTTP {} (request refused)", provider, status);
        throw new ProviderRejectedException(provider + " rejected the request (HTTP " + status + "): " + snippet,
                status, body);
    }

    public static boolean isTransient(int status) {
        return status == 408 || status == 425 || status == 429 || status >= 500;
    }

    /** Retry-After is either whole seconds or an HTTP date; we only act on seconds. */
    static long parseRetryAfterMillis(String value) {
        if (value == null) {
            return 0L;
        }
        try {
            long seconds = Long.parseLong(value.trim());
            return Math.max(0L, seconds) * 1000L;
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
