package lcdjp.common;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class OutboundHttpTest {

    private HttpServer server;
    private String baseUrl;
    private final AtomicInteger requests = new AtomicInteger();
    private final List<String> contentTypes = new CopyOnWriteArrayList<>();
    private final List<String> authHeaders = new CopyOnWriteArrayList<>();
    private final List<String> bodies = new CopyOnWriteArrayList<>();

    private volatile int[] statuses = {200};
    private volatile String retryAfter;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/x";
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private void handle(HttpExchange ex) throws IOException {
        int index = requests.getAndIncrement();
        int status = statuses[Math.min(index, statuses.length - 1)];
        contentTypes.add(String.valueOf(ex.getRequestHeaders().getFirst("Content-Type")));
        authHeaders.add(String.valueOf(ex.getRequestHeaders().getFirst("Authorization")));
        bodies.add(new String(ex.getRequestBody().readAllBytes()));
        if (retryAfter != null && status >= 400) {
            ex.getResponseHeaders().add("Retry-After", retryAfter);
        }
        byte[] out = ("{\"status\":" + status + "}").getBytes();
        ex.sendResponseHeaders(status, out.length);
        ex.getResponseBody().write(out);
        ex.close();
    }

    private OutboundHttp http(int attempts, int threshold) {
        return new OutboundHttp("test", new OutboundGuard("test", threshold, 60_000, attempts, 5));
    }

    @Test
    void postJsonSendsContentTypeHeadersAndBody() throws Exception {
        OutboundHttp.Response r = http(1, 5).postJson(baseUrl, Map.of("Authorization", "Bearer abc"),
                "{\"hello\":\"world\"}", Duration.ofSeconds(5));

        assertEquals(200, r.status());
        assertTrue(r.body().contains("200"));
        assertEquals("application/json", contentTypes.get(0));
        assertEquals("Bearer abc", authHeaders.get(0));
        assertEquals("{\"hello\":\"world\"}", bodies.get(0));
    }

    @Test
    void postFormEncodesTheFields() throws Exception {
        http(1, 5).postForm(baseUrl, Map.of(), Map.of("secret", "a b&c"), Duration.ofSeconds(5));

        assertEquals("application/x-www-form-urlencoded", contentTypes.get(0));
        assertEquals("secret=a+b%26c", bodies.get(0));
    }

    @Test
    void clientErrorIsRejectedNotRetriedAndNeverOpensTheCircuit() throws Exception {
        statuses = new int[] {400};
        OutboundHttp http = http(3, 2);

        for (int i = 0; i < 5; i++) {
            ProviderRejectedException e = assertThrows(ProviderRejectedException.class,
                    () -> http.postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5)));
            assertEquals(400, e.getStatus());
            assertTrue(e.getBody().contains("400"));
        }

        assertEquals(5, requests.get(), "one request per call, no retries");
        assertFalse(http.isCircuitOpen());
    }

    @Test
    void serverErrorIsRetriedThenSucceeds() throws Exception {
        statuses = new int[] {503, 200};

        OutboundHttp.Response r = http(3, 5).postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5));

        assertEquals(200, r.status());
        assertEquals(2, requests.get());
    }

    @Test
    void persistentServerErrorExhaustsAttemptsAndThrowsTransient() {
        statuses = new int[] {500};
        OutboundHttp http = http(3, 5);

        TransientProviderException e = assertThrows(TransientProviderException.class,
                () -> http.postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5)));

        assertEquals(500, e.getStatus());
        assertEquals(3, requests.get());
    }

    @Test
    void tooManyRequestsAndTimeoutStatusesCountAsTransient() {
        for (int status : new int[] {408, 425, 429}) {
            assertTrue(OutboundHttp.isTransient(status), String.valueOf(status));
        }
        assertFalse(OutboundHttp.isTransient(400));
        assertFalse(OutboundHttp.isTransient(404));
        assertTrue(OutboundHttp.isTransient(502));
    }

    @Test
    void repeatedOutagesOpenTheCircuitAndLaterCallsFailFast() {
        statuses = new int[] {503};
        OutboundHttp http = http(1, 2);

        for (int i = 0; i < 2; i++) {
            assertThrows(TransientProviderException.class,
                    () -> http.postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5)));
        }
        assertTrue(http.isCircuitOpen());

        assertThrows(OutboundGuard.CircuitOpenException.class,
                () -> http.postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5)));
        assertEquals(2, requests.get(), "the open circuit must not reach the server");
    }

    @Test
    void retryAfterHeaderIsHonoured() throws Exception {
        statuses = new int[] {503, 200};
        retryAfter = "1";
        long start = System.nanoTime();

        http(2, 5).postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5));

        long elapsedMillis = (System.nanoTime() - start) / 1_000_000L;
        assertEquals(2, requests.get());
        assertTrue(elapsedMillis >= 900, "waited only " + elapsedMillis + " ms");
    }

    @Test
    void timeLimitStopsRetriesEarly() {
        statuses = new int[] {503};
        OutboundHttp http = new OutboundHttp("test", new OutboundGuard("test", 5, 60_000, 3, 500));

        assertThrows(TransientProviderException.class,
                () -> http.postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(5), 50));

        assertEquals(1, requests.get());
    }

    @Test
    void connectionFailureIsAnIoExceptionAndRetried() {
        server.stop(0);
        OutboundHttp http = http(2, 5);

        assertThrows(IOException.class, () -> http.postJson(baseUrl, Map.of(), "{}", Duration.ofSeconds(2)));
    }

    @Test
    void getReturnsTheBody() throws Exception {
        OutboundHttp.Response r = http(1, 5).get(baseUrl, Map.of("Accept", "application/json"), Duration.ofSeconds(5));

        assertEquals(200, r.status());
        assertEquals(1, requests.get());
    }

    @Test
    void retryAfterParsing() {
        assertEquals(3000, OutboundHttp.parseRetryAfterMillis("3"));
        assertEquals(0, OutboundHttp.parseRetryAfterMillis("Wed, 21 Oct 2026 07:28:00 GMT"));
        assertEquals(0, OutboundHttp.parseRetryAfterMillis(null));
    }
}
