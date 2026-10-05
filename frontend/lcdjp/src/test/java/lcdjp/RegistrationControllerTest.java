package lcdjp;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.IOException;
import java.util.Date;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegistrationControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;
    @Mock private EmailService emailService;
    @Mock private PhoneUtil phoneUtil;
    @Mock private HttpServletRequest request;
    @Mock private HttpSession session;

    @InjectMocks
    private RegistrationController registrationController;

    @BeforeEach
    void stubUnmentionedSessionAttributes() {
        lenient().when(session.getAttribute(anyString())).thenReturn(null);
    }

    private RegistrationRequest baseRegistration() {
        RegistrationRequest r = new RegistrationRequest();
        r.setOtpVerified(true);
        r.setUsername("newcitizen1");
        r.setPassword("StrongPass1");
        r.setFirstName("Jane");
        r.setLastName("Doe");
        r.setPhoneNumber("0700111222");
        r.setEmail("jane@example.test");
        r.setDistrict("Kampala");
        return r;
    }

    @Test
    void registerRejectsWhenOtpNotVerified() {
        RegistrationRequest r = baseRegistration();
        r.setOtpVerified(false);

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registerRejectsWhenNoServerSideOtpSessionExists() {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registerRejectsWhenSessionVerifiedUsernameDoesNotMatchRequestedUsername() {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn("someoneelse");

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registerRejectsUsernameShorterThan8Chars() {
        RegistrationRequest r = baseRegistration();
        r.setUsername("short1");
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn("short1");

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registerRejectsShortPasswordWhenNotPrehashed() {
        RegistrationRequest r = baseRegistration();
        r.setPassword("short");
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registerRejectsDuplicateUsernameOrEmail() {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(1);

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void registerRejectsPhoneNumberAlreadyUsedByAnotherAccount() {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(0);
        when(phoneUtil.isAlreadyUsed(eq(r.getPhoneNumber()), isNull())).thenReturn(true);

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.CONFLICT, result.getStatusCode());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void registerHashesPlainPasswordAndDoesNotTrustClientSuppliedHashLookingString() {
        RegistrationRequest r = baseRegistration();
        r.setPasswordHash("not-actually-a-bcrypt-hash");
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(0);
        when(phoneUtil.isAlreadyUsed(anyString(), isNull())).thenReturn(false);
        when(passwordEncoder.encode("StrongPass1")).thenReturn("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed");

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(passwordEncoder).encode("StrongPass1");
        ArgumentCaptor<Object[]> insertArgs = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(anyString(), insertArgs.capture());
        assertEquals("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed",
                insertArgs.getValue()[1]);
    }

    @Test
    void registerAcceptsAlreadyBcryptedPasswordHashWithoutReencoding() {
        RegistrationRequest r = baseRegistration();
        r.setPasswordHash("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(0);
        when(phoneUtil.isAlreadyUsed(anyString(), isNull())).thenReturn(false);

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verifyNoInteractions(passwordEncoder);
        ArgumentCaptor<Object[]> insertArgs = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(anyString(), insertArgs.capture());
        assertEquals(r.getPasswordHash(), insertArgs.getValue()[1]);
    }

    @Test
    void registerNewUserGetsCitizenRoleAndAutoApprovedStatus() throws IOException {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(0);
        when(phoneUtil.isAlreadyUsed(anyString(), isNull())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed");

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("Citizen", body.get("role"));
        assertEquals("Approved", body.get("approvalStatus"));
        assertFalse(body.containsKey("password"));
        assertFalse(body.containsKey("passwordHash"));
        verify(auditLogService).logAction(eq(r.getUsername()), eq("Citizen"), eq("REGISTER"), eq("user"), eq(r.getUsername()), anyString());
        verify(emailService).sendEmail(eq(r.getEmail()), anyString(), anyString());
    }

    @Test
    void registerReturns500AndDoesNotLeakInternalErrorWhenDbInsertFails() {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(0);
        when(phoneUtil.isAlreadyUsed(anyString(), isNull())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed");
        doThrow(new RuntimeException("connection refused")).when(jdbcTemplate)
                .update(anyString(), any(Object[].class));

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertFalse(String.valueOf(body.get("error")).contains("connection refused"),
                "raw exception detail must not leak to the client");
    }

    @Test
    void registerSucceedsEvenIfWelcomeEmailFails() throws IOException {
        RegistrationRequest r = baseRegistration();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_otp_verified_username")).thenReturn(r.getUsername());
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(r.getUsername()), eq(r.getEmail())))
                .thenReturn(0);
        when(phoneUtil.isAlreadyUsed(anyString(), isNull())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed");
        doThrow(new RuntimeException("smtp down")).when(emailService).sendEmail(anyString(), anyString(), anyString());

        ResponseEntity<?> result = registrationController.register(r, request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }
}
