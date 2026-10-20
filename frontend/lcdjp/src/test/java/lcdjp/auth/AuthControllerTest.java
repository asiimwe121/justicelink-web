package lcdjp.auth;

import lcdjp.admin.AuditLogService;
import lcdjp.notification.EmailService;
import lcdjp.security.JwtUtil;
import lcdjp.notification.NotificationDispatcher;
import lcdjp.user.PhoneUtil;
import lcdjp.security.TokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.IOException;
import java.util.Date;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock private AuthRepository authRepository;
    @Mock private AccountSecurityRepository accountSecurity;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;
    @Mock private EmailService emailService;
    @Mock private NotificationDispatcher notificationDispatcher;
    @Mock private PhoneUtil phoneUtil;
    @Mock private JwtUtil jwtUtil;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private HttpServletRequest request;
    @Mock private HttpSession session;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void stubUnmentionedSessionAttributes() {
        lenient().when(session.getAttribute(anyString())).thenReturn(null);
    }

    @Test
    void logoutWithNoSessionReturnsAlreadyLoggedOutAndDoesNotTouchAuditLog() {
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = authController.logout(request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("Already logged out", body.get("message"));
        verifyNoInteractions(auditLogService);
    }

    @Test
    void logoutWithActiveSessionInvalidatesSessionAndLogsAction() {
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("realuser");

        ResponseEntity<?> result = authController.logout(request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(session).invalidate();
        verify(auditLogService).logAction(eq("realuser"), eq("User"), eq("LOGOUT"), eq("user"), eq("realuser"), anyString());
    }

    @Test
    void logoutWithBearerTokenBlacklistsIt() {
        when(request.getHeader("Authorization")).thenReturn("Bearer sometoken.jwt.value");
        when(request.getSession(false)).thenReturn(null);
        Date expiry = new Date();
        when(jwtUtil.extractExpirationSafely("sometoken.jwt.value")).thenReturn(expiry);

        authController.logout(request);

        verify(tokenBlacklistService).blacklistToken("sometoken.jwt.value", expiry);
    }

    @Test
    void logoutWithoutBearerPrefixDoesNotBlacklistAnything() {
        when(request.getHeader("Authorization")).thenReturn("not-a-bearer-token");
        when(request.getSession(false)).thenReturn(null);

        authController.logout(request);

        verifyNoInteractions(tokenBlacklistService);
    }

    @Test
    void authStatusWithNoSessionReportsUnauthenticated() {
        when(request.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = authController.checkAuthStatus(request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(false, body.get("authenticated"));
        assertEquals(1, body.size(), "unauthenticated response should not leak any other fields");
    }

    @Test
    void authStatusWithSessionButNoUsernameReportsUnauthenticated() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn(null);

        ResponseEntity<?> result = authController.checkAuthStatus(request);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(false, body.get("authenticated"));
    }

    @Test
    void authStatusWithValidSessionReturnsProfileFieldsButNoCredentials() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("realuser");
        when(session.getAttribute("role")).thenReturn("Citizen");
        when(session.getAttribute("district")).thenReturn("Kampala");

        ResponseEntity<?> result = authController.checkAuthStatus(request);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("authenticated"));
        assertEquals("realuser", body.get("username"));
        assertEquals("Citizen", body.get("role"));
        assertFalse(body.containsKey("password"));
        assertFalse(body.containsKey("password_hash"));
    }

    @Test
    void authStatusDefaultsIsOrganizationToFalseWhenAttributeMissing() {
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("username")).thenReturn("realuser");
        when(session.getAttribute("isOrganization")).thenReturn(null);

        ResponseEntity<?> result = authController.checkAuthStatus(request);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(false, body.get("isOrganization"));
    }
}
