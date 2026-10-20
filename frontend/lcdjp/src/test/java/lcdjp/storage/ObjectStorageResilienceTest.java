package lcdjp.storage;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class ObjectStorageResilienceTest {

    private HttpServer server;
    private final AtomicInteger putCalls = new AtomicInteger();
    private volatile int failFirst;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String method = exchange.getRequestMethod();
            exchange.getRequestBody().readAllBytes();
            int status;
            if ("PUT".equals(method)) {
                status = putCalls.incrementAndGet() <= failFirst ? 503 : 200;
            } else if ("GET".equals(method)) {
                status = 404;
            } else {
                status = 204;
            }
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private ObjectStorageService service() {
        return new ObjectStorageService("http://127.0.0.1:" + server.getAddress().getPort(), "bucket", "key", "secret", "auto");
    }

    @Test
    void aTemporaryProviderErrorIsRetriedAndThenSucceeds() throws Exception {
        failFirst = 1;
        service().put("a/b.bin", new byte[] {1, 2, 3}, "application/octet-stream");
        assertEquals(2, putCalls.get(), "one 503 then one success");
    }

    @Test
    void aMissingObjectIsNotAnErrorAndIsNotRetried() throws Exception {
        assertNull(service().get("nope"));
    }

    @Test
    void aProviderThatKeepsFailingEndsInAnIoException() {
        failFirst = 1000;
        assertThrows(IOException.class, () -> service().put("a", new byte[] {1}, "x/y"));
    }
}
