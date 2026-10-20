package lcdjp.security;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class RecaptchaServiceTest {

    private HttpServer server;
    private RecaptchaService service;
    private final AtomicInteger requests = new AtomicInteger();
    private volatile int status = 200;
    private volatile String reply = "{\"success\":true}";

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            requests.incrementAndGet();
            ex.getRequestBody().readAllBytes();
            byte[] out = reply.getBytes();
            ex.sendResponseHeaders(status, out.length);
            ex.getResponseBody().write(out);
            ex.close();
        });
        server.start();

        service = new RecaptchaService();
        ReflectionTestUtils.setField(service, "secretKey", "secret");
        ReflectionTestUtils.setField(service, "siteKey", "site");
        ReflectionTestUtils.setField(service, "verifyUrl", "http://127.0.0.1:" + server.getAddress().getPort() + "/verify");
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void acceptsAValidToken() {
        assertTrue(service.verify("token", "10.0.0.1"));
    }

    @Test
    void refusesATokenGoogleRejects() {
        reply = "{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}";

        assertFalse(service.verify("token", null));
    }

    @Test
    void blankTokenIsRefusedWithoutCallingGoogle() {
        assertFalse(service.verify("  ", null));
        assertEquals(0, requests.get());
    }

    @Test
    void notConfiguredAcceptsEverything() {
        ReflectionTestUtils.setField(service, "secretKey", "");

        assertTrue(service.verify("anything", null));
        assertEquals(0, requests.get());
    }

    @Test
    void outageRefusesByDefault() {
        status = 503;

        assertFalse(service.verify("token", null));
    }

    @Test
    void outageLetsPeopleThroughWhenFailOpenIsOn() {
        ReflectionTestUtils.setField(service, "failOpenOnOutage", true);
        status = 503;

        assertTrue(service.verify("token", null));
    }

    @Test
    void unreachableGoogleFollowsTheFailOpenSetting() {
        server.stop(0);

        assertFalse(service.verify("token", null));
        ReflectionTestUtils.setField(service, "failOpenOnOutage", true);
        assertTrue(service.verify("token", null));
    }

    @Test
    void googleRefusingTheRequestIsNeverTreatedAsAnOutage() {
        // A 4xx (for example a wrong secret key) is Google answering "no", not Google being down.
        ReflectionTestUtils.setField(service, "failOpenOnOutage", true);
        status = 400;
        reply = "{}";

        assertFalse(service.verify("token", null));
    }

    @Test
    void tokenIsNotSentTwice() {
        status = 503;

        service.verify("token", null);

        assertEquals(1, requests.get(), "reCAPTCHA tokens are single-use: no retries");
    }
}
