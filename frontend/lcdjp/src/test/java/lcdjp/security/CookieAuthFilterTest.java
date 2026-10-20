package lcdjp.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class CookieAuthFilterTest {

    private final CookieAuthFilter filter = new CookieAuthFilter();

    private String seenAuthHeader(MockHttpServletRequest req, MockHttpServletResponse res) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        HttpServletRequest passed = (HttpServletRequest) chain.getRequest();
        return passed == null ? null : passed.getHeader("Authorization");
    }

    @Test
    void cookieBecomesBearerHeaderOnGet() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/cases");
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        assertEquals("Bearer a.b.c", seenAuthHeader(req, new MockHttpServletResponse()));
    }

    @Test
    void explicitHeaderWins() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/cases");
        req.addHeader("Authorization", "Bearer x.y.z");
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        assertEquals("Bearer x.y.z", seenAuthHeader(req, new MockHttpServletResponse()));
    }

    @Test
    void cookieAuthenticatedPostWithoutCsrfHeaderIsRejected() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/cases");
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertNull(seenAuthHeader(req, res));
        assertEquals(403, res.getStatus());
    }

    @Test
    void cookieAuthenticatedPostWithCsrfHeaderPasses() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/cases");
        req.addHeader("X-Requested-With", "XMLHttpRequest");
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        assertEquals("Bearer a.b.c", seenAuthHeader(req, new MockHttpServletResponse()));
    }

    private static final String DESCRIPTOR = "Bearer e30.e30." + AuthCookies.DESCRIPTOR_SIGNATURE;

    @Test
    void sessionDescriptorIsNotACredentialAndTheCookieTakesOver() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/cases");
        req.addHeader("Authorization", DESCRIPTOR);
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        assertEquals("Bearer a.b.c", seenAuthHeader(req, new MockHttpServletResponse()));
    }

    @Test
    void descriptorPostStillNeedsTheCsrfHeader() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/cases");
        req.addHeader("Authorization", DESCRIPTOR);
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertNull(seenAuthHeader(req, res));
        assertEquals(403, res.getStatus());
    }

    @Test
    void descriptorWithoutCookieIsHiddenSoItIsNeverValidated() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/cases");
        req.addHeader("Authorization", DESCRIPTOR);
        assertNull(seenAuthHeader(req, new MockHttpServletResponse()));
    }

    @Test
    void realTokenHeaderIsNeverMistakenForADescriptor() {
        assertFalse(CookieAuthFilter.isDescriptor("Bearer a.b.c"));
        assertFalse(CookieAuthFilter.isDescriptor("Bearer a.b.c.cookie-session"));
        assertFalse(CookieAuthFilter.isDescriptor(null));
        assertTrue(CookieAuthFilter.isDescriptor(DESCRIPTOR));
    }

    @Test
    void noCookieNoHeaderPassesThroughUntouched() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        assertNull(seenAuthHeader(req, new MockHttpServletResponse()));
    }

    @Test
    void issuedCookieIsHttpOnlySameSiteAndClearable() {
        String set = AuthCookies.issue("a.b.c", new Date(System.currentTimeMillis() + 3_600_000));
        assertTrue(set.contains("HttpOnly"));
        assertTrue(set.contains("SameSite=Lax"));
        assertTrue(set.startsWith(AuthCookies.NAME + "=a.b.c"));
        assertTrue(AuthCookies.clear().contains("Max-Age=0"));
    }

    @Test
    void loginWithAStaleCookieAndNoCsrfHeaderIsNotBlocked() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setCookies(new Cookie(AuthCookies.NAME, "stale.cookie.token"));
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        assertEquals(200, res.getStatus());
        HttpServletRequest passed = (HttpServletRequest) chain.getRequest();
        assertNotNull(passed);
        assertNull(passed.getHeader("Authorization"));
    }

    @Test
    void otherStateChangingApiCallsStillNeedTheCsrfHeader() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/change-password");
        req.setCookies(new Cookie(AuthCookies.NAME, "a.b.c"));
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertNull(seenAuthHeader(req, res));
        assertEquals(403, res.getStatus());
    }
}
