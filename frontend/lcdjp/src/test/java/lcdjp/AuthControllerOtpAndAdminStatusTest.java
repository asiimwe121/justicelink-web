package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerOtpAndAdminStatusTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private HttpServletRequest httpRequest;
    @Mock private HttpSession session;
    @Mock private Authentication authentication;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    @AfterEach
    void resetAdminOnlineStatus() throws Exception {
        Field f = AuthController.class.getDeclaredField("ADMIN_ONLINE_STATUS");
        f.setAccessible(true);
        ((ConcurrentHashMap<?, ?>) f.get(null)).clear();
    }

    @BeforeEach
    void stubUnmentionedSessionAttributes() {
        lenient().when(session.getAttribute(anyString())).thenReturn(null);
    }

    @Test
    void getAdminStatusReportsOfflineWhenNoAdminIsOnline() {
        ResponseEntity<?> result = authController.getAdminStatus();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(false, body.get("online"));
        assertFalse(body.containsKey("adminName"));
    }

    @Test
    void setAdminOnlineRejectsUnauthenticatedRequest() {
        AdminOnlineRequest body = new AdminOnlineRequest();
        body.setOnline(true);

        ResponseEntity<?> result = authController.setAdminOnline(body, null);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void setAdminOnlineRejectsNonAdminRole() {
        User principal = mock(User.class);
        when(principal.getRole()).thenReturn("Citizen");
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("regularjoe");
        when(authentication.getPrincipal()).thenReturn(principal);

        AdminOnlineRequest body = new AdminOnlineRequest();
        body.setOnline(true);

        ResponseEntity<?> result = authController.setAdminOnline(body, authentication);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void setAdminOnlineAllowsAdminRoleAndUpdatesStatus() {
        User principal = mock(User.class);
        when(principal.getRole()).thenReturn("Admin");
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("adminuser");
        when(authentication.getPrincipal()).thenReturn(principal);

        AdminOnlineRequest body = new AdminOnlineRequest();
        body.setOnline(true);

        ResponseEntity<?> result = authController.setAdminOnline(body, authentication);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(eq("adminuser"), eq("Admin"), eq("ADMIN_STATUS_CHANGED"), anyString(), anyString(), anyString());

        ResponseEntity<?> statusResult = authController.getAdminStatus();
        Map<?, ?> statusBody = (Map<?, ?>) statusResult.getBody();
        assertEquals(true, statusBody.get("online"));
        assertEquals("adminuser", statusBody.get("adminName"));
    }

    @Test
    void setAdminOnlineRejectsUsernameAdminWithNonAdminRole() {
        User principal = mock(User.class);
        when(principal.getRole()).thenReturn("Citizen");
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("admin");
        when(authentication.getPrincipal()).thenReturn(principal);

        AdminOnlineRequest body = new AdminOnlineRequest();
        body.setOnline(true);

        ResponseEntity<?> result = authController.setAdminOnline(body, authentication);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }
}
