package lcdjp;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class AfricasTalkingSmsServiceTest {

    private HttpServer server;
    private volatile String lastBody;
    private volatile String lastApiKey;
    private volatile String reply;
    private volatile int status;
    private AfricasTalkingSmsService service;

    @BeforeEach
    void start() throws Exception {
        status = 200;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/messaging", exchange -> {
            lastBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            lastApiKey = exchange.getRequestHeaders().getFirst("apiKey");
            byte[] out = reply.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, out.length);
            exchange.getResponseBody().write(out);
            exchange.close();
        });
        server.start();
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/messaging";
        service = new AfricasTalkingSmsService("lcdjp", "KEY123", "JUSTICELINK", url, HttpClient.newHttpClient());
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private static String recipient(int code, String status) {
        return "{\"SMSMessageData\":{\"Message\":\"x\",\"Recipients\":[{\"statusCode\":" + code
                + ",\"number\":\"+256700000000\",\"status\":\"" + status + "\"}]}}";
    }

    @Test
    void normalisesUgandanNumbersToInternationalForm() {
        assertEquals("+256700000000", AfricasTalkingSmsService.toInternational("0700 000 000"));
        assertEquals("+256700000000", AfricasTalkingSmsService.toInternational("256700000000"));
        assertEquals("+256700000000", AfricasTalkingSmsService.toInternational("+256700000000"));
        assertEquals("+256700000000", AfricasTalkingSmsService.toInternational("700000000"));
        assertEquals("+256700000000", AfricasTalkingSmsService.toInternational("00256700000000"));
        assertEquals("+254712345678", AfricasTalkingSmsService.toInternational("+254712345678"));
        assertThrows(IllegalArgumentException.class, () -> AfricasTalkingSmsService.toInternational("123"));
        assertThrows(IllegalArgumentException.class, () -> AfricasTalkingSmsService.toInternational(null));
    }

    @Test
    void sendsTheMessageWithTheApiKeyAndAcceptedStatus() throws Exception {
        reply = recipient(101, "Success");

        service.sendSms("0700000000", "Your code is 123456 & more");

        assertEquals("KEY123", lastApiKey);
        assertTrue(lastBody.contains("username=lcdjp"));
        assertTrue(lastBody.contains("to=%2B256700000000"));
        assertTrue(lastBody.contains("from=JUSTICELINK"));
        assertTrue(lastBody.contains("123456+%26+more"), "message must be form-encoded");
    }

    @Test
    void aRecipientTheProviderRejectedIsAnError() {
        reply = recipient(403, "InvalidPhoneNumber");
        Exception e = assertThrows(IllegalStateException.class, () -> service.sendSms("0700000000", "hi"));
        assertTrue(e.getMessage().contains("InvalidPhoneNumber"));
        assertFalse(e.getMessage().contains("0700000000"), "full number must not leak into errors");
    }

    @Test
    void noRecipientsMeansNothingWasSent() {
        reply = "{\"SMSMessageData\":{\"Message\":\"InvalidSenderId\",\"Recipients\":[]}}";
        Exception e = assertThrows(IllegalStateException.class, () -> service.sendSms("0700000000", "hi"));
        assertTrue(e.getMessage().contains("InvalidSenderId"));
    }

    @Test
    void badCredentialsAndServerErrorsAreErrors() {
        status = 401;
        reply = "Unauthorized";
        assertTrue(assertThrows(IllegalStateException.class, () -> service.sendSms("0700000000", "hi"))
                .getMessage().contains("credentials"));

        status = 500;
        assertTrue(assertThrows(IllegalStateException.class, () -> service.sendSms("0700000000", "hi"))
                .getMessage().contains("HTTP 500"));
    }

    @Test
    void refusesToStartWithoutCredentials() {
        AfricasTalkingSmsService noKey = new AfricasTalkingSmsService("", "", "", "http://localhost/x", HttpClient.newHttpClient());
        assertThrows(IllegalStateException.class, noKey::requireCredentials);
    }
}
