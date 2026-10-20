package lcdjp.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpTest {

    private HttpServletRequest request(String xff, String cf) {
        HttpServletRequest r = mock(HttpServletRequest.class);
        when(r.getRemoteAddr()).thenReturn("10.0.0.1");
        when(r.getHeader("X-Forwarded-For")).thenReturn(xff);
        when(r.getHeader("CF-Connecting-IP")).thenReturn(cf);
        return r;
    }

    @Test
    void untrustedHeadersAreIgnored() {
        assertEquals("10.0.0.1", ClientIp.resolve(request("6.6.6.6", "7.7.7.7"), false, 0));
        assertEquals("10.0.0.1", ClientIp.resolve(request("6.6.6.6", "7.7.7.7"), false, 2));
    }

    @Test
    void legacyModeKeepsPreviousBehaviour() {
        assertEquals("7.7.7.7", ClientIp.resolve(request("1.1.1.1, 2.2.2.2", "7.7.7.7"), true, 0));
        assertEquals("1.1.1.1", ClientIp.resolve(request("1.1.1.1, 2.2.2.2", null), true, 0));
    }

    @Test
    void hopCountPicksEntryFromTheRightSoForgedLeftEntriesAreIgnored() {
        // client forged "6.6.6.6"; the proxy appended the real client 3.3.3.3
        assertEquals("3.3.3.3", ClientIp.resolve(request("6.6.6.6, 3.3.3.3", "7.7.7.7"), true, 1));
        // Cloudflare + nginx: "client, cloudflare-edge"
        assertEquals("3.3.3.3", ClientIp.resolve(request("6.6.6.6, 3.3.3.3, 172.70.0.1", null), true, 2));
    }

    @Test
    void hopCountLargerThanHeaderFallsBackToFirstEntry() {
        assertEquals("3.3.3.3", ClientIp.resolve(request("3.3.3.3", null), true, 5));
    }

    @Test
    void missingHeaderFallsBackToPeerAddress() {
        assertEquals("10.0.0.1", ClientIp.resolve(request(null, null), true, 1));
    }
}
