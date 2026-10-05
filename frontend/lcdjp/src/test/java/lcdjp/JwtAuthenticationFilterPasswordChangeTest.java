package lcdjp;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterPasswordChangeTest {

    private JwtUtil jwtUtil;
    private UserService userService;
    private TokenBlacklistService blacklist;
    private SessionRevocationService revocations;
    private JwtAuthenticationFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() throws Exception {
        SecurityContextHolder.clearContext();
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",
                "test-only-secret-key-not-used-anywhere-else-0123456789");
        Method init = JwtUtil.class.getDeclaredMethod("init");
        init.setAccessible(true);
        init.invoke(jwtUtil);

        userService = mock(UserService.class);
        blacklist = mock(TokenBlacklistService.class);
        chain = mock(FilterChain.class);
        revocations = mock(SessionRevocationService.class);
        filter = new JwtAuthenticationFilter(jwtUtil, userService, blacklist, revocations);

        when(userService.findAuthEssentialsByUsername("newadmin"))
                .thenReturn(new User(1L, "newadmin", "SYSTEM_ADMIN", "Kampala", true));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletResponse call(String path, String token) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
        req.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        return res;
    }

    @Test
    void passwordChangeTokenIsRefusedOnOtherEndpoints() throws Exception {
        String token = jwtUtil.generatePasswordChangeToken("newadmin", "SYSTEM_ADMIN", "Kampala");

        MockHttpServletResponse res = call("/api/admin/users", token);

        assertEquals(403, res.getStatus());
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void passwordChangeTokenReachesChangePasswordEndpoints() throws Exception {
        String token = jwtUtil.generatePasswordChangeToken("newadmin", "SYSTEM_ADMIN", "Kampala");

        for (String path : new String[] {
                "/api/auth/change-password",
                "/api/auth/change-password/resend-otp",
                "/api/auth/change-password/verify-otp"}) {
            SecurityContextHolder.clearContext();
            MockHttpServletResponse res = call(path, token);
            assertEquals(200, res.getStatus(), path);
        }
        verify(chain, times(3)).doFilter(any(), any());
    }

    @Test
    void normalTokenStillReachesOtherEndpoints() throws Exception {
        String token = jwtUtil.generateToken("newadmin", "SYSTEM_ADMIN", "Kampala");

        MockHttpServletResponse res = call("/api/admin/users", token);

        assertEquals(200, res.getStatus());
        verify(chain).doFilter(any(), any());
    }

    @Test
    void tokenIssuedBeforeAPasswordResetIsRefused() throws Exception {
        String token = jwtUtil.generateToken("newadmin", "SYSTEM_ADMIN", "Kampala");
        when(revocations.isRevoked(eq("newadmin"), any(java.util.Date.class))).thenReturn(true);

        MockHttpServletResponse res = call("/api/admin/users", token);

        assertEquals(401, res.getStatus());
        assertTrue(res.getContentAsString().contains("session has ended"));
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void tokenIsAcceptedWhenNoResetRevokedIt() throws Exception {
        String token = jwtUtil.generateToken("newadmin", "SYSTEM_ADMIN", "Kampala");
        when(revocations.isRevoked(eq("newadmin"), any(java.util.Date.class))).thenReturn(false);

        MockHttpServletResponse res = call("/api/admin/users", token);

        assertEquals(200, res.getStatus());
        verify(chain).doFilter(any(), any());
    }
}
