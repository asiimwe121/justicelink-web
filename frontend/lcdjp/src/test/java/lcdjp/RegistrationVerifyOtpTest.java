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
class RegistrationVerifyOtpTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private HttpServletRequest httpRequest;
    @Mock private HttpSession session;

    @InjectMocks
    private RegistrationController registrationController;

    @BeforeEach
    void stubPasswordEncoder() {
        lenient().when(passwordEncoder.encode(anyString()))
                .thenReturn("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed");
    }

    @BeforeEach
    void stubUnmentionedSessionAttributes() {
        lenient().when(session.getAttribute(anyString())).thenReturn(null);
    }

    private VerificationOtpRequest otpRequest(String username, String otp) {
        VerificationOtpRequest r = new VerificationOtpRequest();
        r.setUsername(username);
        r.setOtp(otp);
        return r;
    }

    @Test
    void verifyOtpRejectsMalformedOtpFormat() {
        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("newcitizen1", "12"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void verifyOtpRejectsWhenPendingRegistrationUsernameMismatches() {
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "otheruser");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("newcitizen1", "123456"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void verifyOtpRejectsAfterMaxAttemptsExceeded() {
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "newcitizen1");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);
        when(session.getAttribute("lcdjp_pending_otp_attempts")).thenReturn(OtpConfig.MAX_OTP_ATTEMPTS);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("newcitizen1", "123456"), httpRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
    }

    @Test
    void verifyOtpRejectsExpiredCode() {
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "newcitizen1");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);
        when(session.getAttribute("lcdjp_pending_otp")).thenReturn("123456");
        when(session.getAttribute("lcdjp_pending_otp_expiry")).thenReturn(System.currentTimeMillis() - 1000);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("newcitizen1", "123456"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void verifyOtpRejectsWrongCodeAndIncrementsAttemptCounter() {
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "newcitizen1");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);
        when(session.getAttribute("lcdjp_pending_otp")).thenReturn("123456");
        when(session.getAttribute("lcdjp_pending_otp_expiry")).thenReturn(System.currentTimeMillis() + 60_000);
        when(session.getAttribute("lcdjp_pending_otp_attempts")).thenReturn(2);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("newcitizen1", "999999"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verify(session).setAttribute("lcdjp_pending_otp_attempts", 3);
    }

    @Test
    void verifyOtpWithCorrectCodeHandsOffToRegisterAndClearsSessionOnSuccess() {
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "newcitizen1");
        pending.put("otpVerified", false);
        pending.put("password", "StrongPass1");
        pending.put("firstName", "Jane");
        pending.put("lastName", "Doe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);
        when(session.getAttribute("lcdjp_pending_otp")).thenReturn("123456");
        when(session.getAttribute("lcdjp_pending_otp_expiry")).thenReturn(System.currentTimeMillis() + 60_000);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn("newcitizen1");
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("newcitizen1")))
                .thenReturn(0);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("newcitizen1", "123456"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(session).removeAttribute("lcdjp_pending_registration");
        verify(session).removeAttribute("lcdjp_pending_otp");
        verify(session).removeAttribute("lcdjp_otp_verified_username");
    }

    @Test
    void verifyOtpLegacyFlowReturnsNotFoundWhenNoSessionExists() {
        when(httpRequest.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("someuser", "123456"), httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void verifyOtpLegacyFlowSucceedsAndClearsSessionAttributes() {
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(null);
        when(session.getAttribute("lcdjp_legacy_otp_username")).thenReturn("someuser");
        when(session.getAttribute("lcdjp_legacy_otp")).thenReturn("654321");
        when(session.getAttribute("lcdjp_legacy_otp_expiry")).thenReturn(System.currentTimeMillis() + 60_000);

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("someuser", "654321"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(session).removeAttribute("lcdjp_legacy_otp_username");
        verify(session).removeAttribute("lcdjp_legacy_otp");
    }

    @Test
    void verifyOtpLegacyFlowRejectsUsernameNotMatchingActiveSession() {
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(null);
        when(session.getAttribute("lcdjp_legacy_otp_username")).thenReturn("someoneelse");

        ResponseEntity<?> result = registrationController.verifyOtp(otpRequest("someuser", "654321"), httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }
}
