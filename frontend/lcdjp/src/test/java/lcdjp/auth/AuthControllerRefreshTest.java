package lcdjp.auth;

import lcdjp.admin.AuditLogService;
import lcdjp.security.JwtUtil;
import lcdjp.security.SessionRevocationService;
import lcdjp.security.TokenBlacklistService;
import lcdjp.user.User;
import lcdjp.user.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerRefreshTest {

    @Mock private JwtUtil jwtUtil;
    @Mock private UserService userService;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private AuditLogService auditLogService;
    @Mock private SessionRevocationService sessionRevocationService;

    @InjectMocks
    private AuthController authController;

    private User user(String approvalStatus, boolean active) {
        User u = new User();
        u.setUsername("realuser");
        u.setRole("Citizen");
        u.setDistrict("Kampala");
        u.setApprovalStatus(approvalStatus);
        u.setActive(active);
        return u;
    }

    @Test
    void refreshRejectsBlacklistedToken() {
        when(tokenBlacklistService.isTokenBlacklisted("old.jwt.token")).thenReturn(true);

        ResponseEntity<?> result = authController.refreshToken("Bearer old.jwt.token");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyString());
    }

    @Test
    void refreshRejectsPasswordChangeOnlyToken() {
        when(tokenBlacklistService.isTokenBlacklisted("pw.jwt.token")).thenReturn(false);
        when(jwtUtil.validateToken("pw.jwt.token")).thenReturn(true);
        when(jwtUtil.isPasswordChangeToken("pw.jwt.token")).thenReturn(true);

        ResponseEntity<?> result = authController.refreshToken("Bearer pw.jwt.token");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyString());
    }

    @Test
    void refreshRejectsDisabledAccount() {
        when(tokenBlacklistService.isTokenBlacklisted("old.jwt.token")).thenReturn(false);
        when(jwtUtil.validateToken("old.jwt.token")).thenReturn(true);
        when(jwtUtil.extractUsername("old.jwt.token")).thenReturn("realuser");
        when(userService.findByUsername("realuser")).thenReturn(user("Disabled", true));

        ResponseEntity<?> result = authController.refreshToken("Bearer old.jwt.token");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyString());
    }

    @Test
    void refreshIssuesNewTokenForValidActiveUser() {
        when(tokenBlacklistService.isTokenBlacklisted("old.jwt.token")).thenReturn(false);
        when(jwtUtil.validateToken("old.jwt.token")).thenReturn(true);
        when(jwtUtil.extractUsername("old.jwt.token")).thenReturn("realuser");
        when(userService.findByUsername("realuser")).thenReturn(user("Approved", true));
        when(jwtUtil.generateToken("realuser", "Citizen", "Kampala")).thenReturn("new.jwt.token");

        ResponseEntity<?> result = authController.refreshToken("Bearer old.jwt.token");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("new.jwt.token", ((Map<?, ?>) result.getBody()).get("token"));
    }

    @Test
    void refreshRejectsTokenIssuedBeforeAPasswordReset() {
        java.util.Date issued = new java.util.Date(1_000_000L);
        when(tokenBlacklistService.isTokenBlacklisted("old.jwt.token")).thenReturn(false);
        when(jwtUtil.validateToken("old.jwt.token")).thenReturn(true);
        when(jwtUtil.extractUsername("old.jwt.token")).thenReturn("realuser");
        when(jwtUtil.extractIssuedAt("old.jwt.token")).thenReturn(issued);
        when(sessionRevocationService.isRevoked("realuser", issued)).thenReturn(true);

        ResponseEntity<?> result = authController.refreshToken("Bearer old.jwt.token");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyString());
    }
}
