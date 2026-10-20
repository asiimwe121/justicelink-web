package lcdjp.notification;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class EmailServiceTest {

    private HttpServer server;
    private EmailService emailService;
    private final List<String> receivedBodies = new CopyOnWriteArrayList<>();
    private final AtomicInteger requestCount = new AtomicInteger(0);

    private volatile int[] statusSequence = {200};

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();

        emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "brevoEndpoint",
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v3/smtp/email");
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "test-key");
        ReflectionTestUtils.setField(emailService, "senderEmail", "noreply@justicelinkug.org");
        ReflectionTestUtils.setField(emailService, "senderName", "JusticeLink Uganda");
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private void handle(HttpExchange exchange) throws IOException {
        int index = requestCount.getAndIncrement();
        int status = statusSequence[Math.min(index, statusSequence.length - 1)];

        byte[] body = exchange.getRequestBody().readAllBytes();
        receivedBodies.add(new String(body));

        byte[] response = (status >= 200 && status < 300 ? "{\"messageId\":\"abc\"}" : "{\"error\":\"stub\"}")
                .getBytes();
        exchange.sendResponseHeaders(status, response.length);
        exchange.getResponseBody().write(response);
        exchange.close();
    }

    @Test
    void successfulSendReturnsWithoutRetrying() throws IOException {
        statusSequence = new int[]{200};

        emailService.sendEmail("citizen@example.com", "Case Update", "<p>Your case was updated.</p>");

        assertEquals(1, requestCount.get());
        String sentBody = receivedBodies.get(0);
        assertTrue(sentBody.contains("citizen@example.com"));
        assertTrue(sentBody.contains("Case Update"));
        assertTrue(sentBody.contains("noreply@justicelinkug.org"));
    }

    @Test
    void serverErrorIsRetriedThenSucceeds() throws IOException {
        statusSequence = new int[]{500, 200};

        emailService.sendEmail("citizen@example.com", "Case Update", "body");

        assertEquals(2, requestCount.get());
    }

    @Test
    void clientErrorIsNotRetried() {
        statusSequence = new int[]{400};

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> emailService.sendEmail("bad@example.com", "Subject", "body"));

        assertEquals(1, requestCount.get());
        assertTrue(ex.getMessage().contains("400"));
    }

    @Test
    void persistentServerErrorExhaustsRetriesThenThrows() {
        statusSequence = new int[]{503, 503, 503};

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> emailService.sendEmail("citizen@example.com", "Subject", "body"));

        assertEquals(3, requestCount.get());
        assertTrue(ex.getMessage().contains("503"));
    }

    @Test
    void retriesStopOnceTheTimeBudgetIsSpent() {
        // A zero budget means "no time left", so the first failure is final (no 8-second hanging server needed).
        ReflectionTestUtils.setField(emailService, "retryBudgetMillis", 0L);
        statusSequence = new int[]{503, 503, 503};

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> emailService.sendEmail("citizen@example.com", "Subject", "body"));

        assertEquals(1, requestCount.get());
        assertTrue(ex.getMessage().contains("503"));
    }

    @Test
    void badAddressesNeverSwitchEmailOffForOtherUsers() throws IOException {
        statusSequence = new int[]{400, 400, 400, 400, 400, 400, 200};

        for (int i = 0; i < 6; i++) {
            assertThrows(RuntimeException.class,
                    () -> emailService.sendEmail("typo" + "@exmaple.com", "Subject", "body"));
        }

        emailService.sendEmail("good@example.com", "Subject", "body");
        assertEquals(7, requestCount.get(), "six refusals (no retries) plus the good send");
    }

    @Test
    void connectionFailureRetriesThenThrowsIOException() throws IOException {
        server.stop(0);

        assertThrows(IOException.class,
                () -> emailService.sendEmail("citizen@example.com", "Subject", "body"));
    }
}
