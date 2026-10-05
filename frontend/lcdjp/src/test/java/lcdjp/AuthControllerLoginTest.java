package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerLoginTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private RateLimiterService rateLimiterService;
    @Mock private RecaptchaService recaptchaService;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuditLogService auditLogService;
    @Mock private EmailService emailService;
    @Mock private LoginOtpService loginOtpService;
    @Mock private LoginLockoutService loginLockoutService;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private HttpSession session;

    @InjectMocks
    private AuthController authController;

    private static final String IP = "203.0.113.10";

    @BeforeEach
    void setUp() {
        lenient().when(request.getRemoteAddr()).thenReturn(IP);
        lenient().when(request.getSession()).thenReturn(session);
        lenient().when(request.getSession(anyBoolean())).thenReturn(session);
        lenient().when(rateLimiterService.isAllowed(eq("login:" + IP), eq(10), eq(1))).thenReturn(true);
        lenient().when(rateLimiterService.isAllowed(eq("login-otp:" + IP), eq(20), eq(5))).thenReturn(true);
        lenient().when(recaptchaService.verify(any(), any())).thenReturn(true);
        lenient().when(loginLockoutService.lockedUntil(anyString())).thenReturn(null);
        lenient().when(loginLockoutService.recordFailure(anyString()))
                .thenReturn(new LoginLockoutService.FailureResult(false, 2, null));
        lenient().when(loginLockoutService.getSupportEmail()).thenReturn("support@justicelinkug.org");
    }

    private LoginRequest loginBody(String username, String password) {
        LoginRequest body = new LoginRequest();
        body.setUsername(username);
        body.setPassword(password);
        return body;
    }

    private VerificationOtpRequest otpBody(String username, String otp) {
        VerificationOtpRequest body = new VerificationOtpRequest();
        body.setUsername(username);
        body.setOtp(otp);
        return body;
    }

    private Map<String, Object> approvedUserRow(String username, String bcryptHash, String role) {
        Map<String, Object> row = new HashMap<>();
        row.put("username", username);
        row.put("password_hash", bcryptHash);
        row.put("role", role);
        row.put("approval_status", "Approved");
        row.put("district", "Kampala");
        row.put("first_name", "Test");
        row.put("last_name", "User");
        row.put("email", "test@example.test");
        row.put("phone", "0700000000");
        row.put("user_type", "individual");
        row.put("password_changed", true);
        return row;
    }

    private Map<String, Object> otpSentResult(String channel) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("channel", channel);
        result.put("message", "A login code was sent to your " + ("email".equals(channel) ? "email address." : "phone number."));
        return result;
    }

    @Test
    void rejectsWhenRateLimitExceeded() {
        when(rateLimiterService.isAllowed(eq("login:" + IP), eq(10), eq(1))).thenReturn(false);

        ResponseEntity<?> result = authController.login(loginBody("someuser", "somepassword"), request, response);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void rejectsMissingCredentialsWithoutHittingDb() {
        ResponseEntity<?> result = authController.login(loginBody("", ""), request, response);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void unknownUsernameAndWrongPasswordReturnTheSameGenericMessage() {
        when(jdbcTemplate.queryForList(anyString(), eq("ghost"))).thenReturn(List.of());
        ResponseEntity<?> unknownResult = authController.login(loginBody("ghost", "whatever1"), request, response);

        Map<String, Object> row = approvedUserRow("realuser", "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash", "Citizen");
        when(jdbcTemplate.queryForList(anyString(), eq("realuser"))).thenReturn(List.of(row));
        when(passwordEncoder.matches(eq("wrongpass"), anyString())).thenReturn(false);
        ResponseEntity<?> wrongPassResult = authController.login(loginBody("realuser", "wrongpass"), request, response);

        assertEquals(HttpStatus.UNAUTHORIZED, unknownResult.getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, wrongPassResult.getStatusCode());
        assertEquals(
                ((Map<?, ?>) unknownResult.getBody()).get("error"),
                ((Map<?, ?>) wrongPassResult.getBody()).get("error")
        );

        verify(auditLogService).logActionWithRequest(
                eq("ghost"), anyString(), eq("LOGIN_FAILED"), anyString(), anyString(),
                contains("user not found"), eq(request));
        verify(auditLogService).logActionWithRequest(
                eq("realuser"), anyString(), eq("LOGIN_FAILED"), anyString(), anyString(),
                contains("incorrect password"), eq(request));
        verifyNoInteractions(loginOtpService);
    }

    @Test
    void successfulPasswordCheckSendsOtpAndDoesNotIssueATokenYet() throws Exception {
        String hash = "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash";
        Map<String, Object> row = approvedUserRow("realuser", hash, "Citizen");
        when(jdbcTemplate.queryForList(anyString(), eq("realuser"))).thenReturn(List.of(row));
        when(passwordEncoder.matches(eq("correctpass"), eq(hash))).thenReturn(true);
        when(loginOtpService.sendOtp(eq(request), eq("realuser"), eq("test@example.test"), eq("0700000000"), eq(false)))
                .thenReturn(otpSentResult("email"));

        ResponseEntity<?> result = authController.login(loginBody("realuser", "correctpass"), request, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue((Boolean) body.get("success"));
        assertTrue((Boolean) body.get("requireOtp"), "a correct password must not finish the login by itself");
        assertEquals("realuser", body.get("username"));
        assertEquals("email", body.get("channel"));
        assertFalse(body.containsKey("token"), "no token should be issued before the OTP step succeeds");
        assertFalse(body.containsKey("password_hash"), "response must never include the stored hash");
        assertFalse(body.containsKey("password"), "response must never include a password field");

        verify(auditLogService, never()).logActionWithRequest(
                anyString(), anyString(), eq("LOGIN"), anyString(), anyString(), anyString(), any());
        verify(auditLogService).logActionWithRequest(
                eq("realuser"), anyString(), eq("LOGIN_OTP_SENT"), anyString(), anyString(), anyString(), eq(request));
        verifyNoInteractions(jwtUtil);
        verify(jdbcTemplate, never()).update(contains("UPDATE users SET password_hash"), anyString(), anyString());
    }

    @Test
    void disabledAccountIsRejectedAfterPasswordCheckSucceeds() {
        Map<String, Object> row = approvedUserRow("disableduser", "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash", "Citizen");
        row.put("approval_status", "Disabled");
        when(jdbcTemplate.queryForList(anyString(), eq("disableduser"))).thenReturn(List.of(row));
        when(passwordEncoder.matches(eq("correctpass"), anyString())).thenReturn(true);

        ResponseEntity<?> result = authController.login(loginBody("disableduser", "correctpass"), request, response);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jwtUtil, never()).generateToken(anyString(), anyString(), anyString());
        verifyNoInteractions(loginOtpService);
    }

    @Test
    void legacyPlaintextPasswordIsUpgradedToBcryptOnSuccessfulLogin() throws Exception {
        Map<String, Object> row = approvedUserRow("legacyuser", "plaintextpassword", "Citizen");
        when(jdbcTemplate.queryForList(anyString(), eq("legacyuser"))).thenReturn(List.of(row));
        when(passwordEncoder.encode("plaintextpassword")).thenReturn("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed");
        when(loginOtpService.sendOtp(eq(request), eq("legacyuser"), anyString(), anyString(), eq(false)))
                .thenReturn(otpSentResult("email"));

        ResponseEntity<?> result = authController.login(loginBody("legacyuser", "plaintextpassword"), request, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue((Boolean) ((Map<?, ?>) result.getBody()).get("requireOtp"));
        verify(jdbcTemplate).update(
                eq("UPDATE users SET password_hash = ? WHERE username = ?"),
                eq("$2a$10$freshlyhashedfreshlyhashedfreshlyhashedfreshlyhashed"),
                eq("legacyuser"));
    }

    @Test
    void verifyLoginOtpRejectsWhenRateLimitExceeded() {
        when(rateLimiterService.isAllowed(eq("login-otp:" + IP), eq(20), eq(5))).thenReturn(false);

        ResponseEntity<?> result = authController.verifyLoginOtp(otpBody("realuser", "123456"), request);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
        verifyNoInteractions(loginOtpService);
    }

    @Test
    void verifyLoginOtpRejectsIncorrectCodeWithoutIssuingAToken() {
        when(loginOtpService.verifyOtp(request, "realuser", "000000"))
                .thenReturn(failVerify("Incorrect code. Please try again."));

        ResponseEntity<?> result = authController.verifyLoginOtp(otpBody("realuser", "000000"), request);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        assertEquals("Incorrect code. Please try again.", ((Map<?, ?>) result.getBody()).get("error"));
        verifyNoInteractions(jwtUtil);
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void verifyLoginOtpWithCorrectCodeCompletesLoginAndReturnsToken() {
        when(loginOtpService.verifyOtp(request, "realuser", "123456")).thenReturn(okVerify(false));
        Map<String, Object> row = approvedUserRow("realuser",
                "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash", "Citizen");
        when(jdbcTemplate.queryForList(anyString(), eq("realuser"))).thenReturn(List.of(row));
        when(jwtUtil.generateToken("realuser", "Citizen", "Kampala", false)).thenReturn("signed.jwt.token");

        ResponseEntity<?> result = authController.verifyLoginOtp(otpBody("realuser", "123456"), request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("signed.jwt.token", body.get("token"));
        assertTrue((Boolean) body.get("success"));
        assertFalse(body.containsKey("password_hash"), "response must never include the stored hash");
        assertFalse(body.containsKey("password"), "response must never include a password field");

        verify(session).setAttribute("username", "realuser");
        verify(auditLogService).logActionWithRequest(
                eq("realuser"), anyString(), eq("LOGIN"), anyString(), anyString(), anyString(), eq(request));
    }

    @Test
    void firstLoginAdminGetsOtpNotAPasswordChangeTokenAfterPasswordCheck() throws Exception {
        String hash = "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash";
        Map<String, Object> row = approvedUserRow("newadmin", hash, "SYSTEM_ADMIN");
        row.put("password_changed", false);
        when(jdbcTemplate.queryForList(anyString(), eq("newadmin"))).thenReturn(List.of(row));
        when(passwordEncoder.matches(eq("temppass"), eq(hash))).thenReturn(true);
        when(loginOtpService.sendOtp(eq(request), eq("newadmin"), anyString(), anyString(), eq(false)))
                .thenReturn(otpSentResult("email"));

        ResponseEntity<?> result = authController.login(loginBody("newadmin", "temppass"), request, response);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue((Boolean) body.get("requireOtp"), "password alone must not skip the OTP step");
        assertFalse(body.containsKey("token"), "no token may be issued before the OTP is verified");
        assertFalse(body.containsKey("requirePasswordChange"));
        verifyNoInteractions(jwtUtil);
    }

    @Test
    void verifyLoginOtpForFirstLoginAdminRequiresPasswordChangeAfterOtp() {
        when(loginOtpService.verifyOtp(request, "newadmin", "123456")).thenReturn(okVerify(false));
        Map<String, Object> row = approvedUserRow("newadmin",
                "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash", "SYSTEM_ADMIN");
        row.put("password_changed", false);
        when(jdbcTemplate.queryForList(anyString(), eq("newadmin"))).thenReturn(List.of(row));
        when(jwtUtil.generatePasswordChangeToken("newadmin", "SYSTEM_ADMIN", "Kampala")).thenReturn("temp.jwt.token");

        ResponseEntity<?> result = authController.verifyLoginOtp(otpBody("newadmin", "123456"), request);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue((Boolean) body.get("requirePasswordChange"));
        assertEquals("temp.jwt.token", body.get("token"));
        verify(session, never()).setAttribute(eq("username"), any());
    }

    @Test
    void verifyLoginOtpRejectsDisabledAccountEvenWithCorrectCode() {
        when(loginOtpService.verifyOtp(request, "disableduser", "123456")).thenReturn(okVerify(false));
        Map<String, Object> row = approvedUserRow("disableduser",
                "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash", "Citizen");
        row.put("approval_status", "Disabled");
        when(jdbcTemplate.queryForList(anyString(), eq("disableduser"))).thenReturn(List.of(row));

        ResponseEntity<?> result = authController.verifyLoginOtp(otpBody("disableduser", "123456"), request);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jwtUtil);
    }

    private LoginOtpService.VerifyResult okVerify(boolean rememberMe) {
        return LoginOtpService.VerifyResult.ok(rememberMe);
    }

    private LoginOtpService.VerifyResult failVerify(String error) {
        return LoginOtpService.VerifyResult.fail(error);
    }

    private static final String BCRYPT = "$2a$10$hashhashhashhashhashhashhashhashhashhashhashhashhash";

    @Test
    void wrongPasswordReportsHowManyAttemptsAreLeft() {
        when(jdbcTemplate.queryForList(anyString(), eq("realuser")))
                .thenReturn(List.of(approvedUserRow("realuser", BCRYPT, "Citizen")));
        when(passwordEncoder.matches(eq("wrongpass"), anyString())).thenReturn(false);
        when(loginLockoutService.recordFailure("realuser"))
                .thenReturn(new LoginLockoutService.FailureResult(false, 1, null));

        ResponseEntity<?> result = authController.login(loginBody("realuser", "wrongpass"), request, response);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(1, body.get("attemptsRemaining"));
        assertTrue(body.get("error").toString().contains("1 attempt left"));
        verify(loginLockoutService, never()).recordSuccess(anyString());
    }

    @Test
    void thirdWrongPasswordBlocksTheAccountAndReturnsLocked() {
        LocalDateTime until = LocalDateTime.now().plusHours(5);
        when(jdbcTemplate.queryForList(anyString(), eq("realuser")))
                .thenReturn(List.of(approvedUserRow("realuser", BCRYPT, "Citizen")));
        when(passwordEncoder.matches(eq("wrongpass"), anyString())).thenReturn(false);
        when(loginLockoutService.recordFailure("realuser"))
                .thenReturn(new LoginLockoutService.FailureResult(true, 0, until));

        ResponseEntity<?> result = authController.login(loginBody("realuser", "wrongpass"), request, response);

        assertEquals(HttpStatus.LOCKED, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("locked"));
        assertEquals("support@justicelinkug.org", body.get("supportEmail"));
        verify(auditLogService).logActionWithRequest(
                eq("realuser"), anyString(), eq("LOGIN_LOCKED"), anyString(), anyString(), anyString(), eq(request));
        verifyNoInteractions(loginOtpService);
    }

    @Test
    void unknownUsernameIsCountedAndCanBeBlockedToo() {
        when(jdbcTemplate.queryForList(anyString(), eq("ghost"))).thenReturn(List.of());
        when(loginLockoutService.recordFailure("ghost"))
                .thenReturn(new LoginLockoutService.FailureResult(true, 0, LocalDateTime.now().plusHours(5)));

        ResponseEntity<?> result = authController.login(loginBody("ghost", "whatever1"), request, response);

        assertEquals(HttpStatus.LOCKED, result.getStatusCode());
        verify(loginLockoutService).recordFailure("ghost");
    }

    @Test
    void blockedAccountIsRefusedEvenWithTheCorrectPassword() {
        when(loginLockoutService.lockedUntil("realuser")).thenReturn(LocalDateTime.now().plusHours(3));

        ResponseEntity<?> result = authController.login(loginBody("realuser", "correctpass"), request, response);

        assertEquals(HttpStatus.LOCKED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
        verifyNoInteractions(passwordEncoder);
        verifyNoInteractions(loginOtpService);
        verify(loginLockoutService, never()).recordFailure(anyString());
        verify(auditLogService).logActionWithRequest(
                eq("realuser"), anyString(), eq("LOGIN_BLOCKED"), anyString(), anyString(), anyString(), eq(request));
    }

    @Test
    void correctPasswordClearsTheFailedAttemptCounter() throws Exception {
        when(jdbcTemplate.queryForList(anyString(), eq("realuser")))
                .thenReturn(List.of(approvedUserRow("realuser", BCRYPT, "Citizen")));
        when(passwordEncoder.matches(eq("correctpass"), eq(BCRYPT))).thenReturn(true);
        when(loginOtpService.sendOtp(eq(request), eq("realuser"), anyString(), anyString(), eq(false)))
                .thenReturn(otpSentResult("email"));

        authController.login(loginBody("realuser", "correctpass"), request, response);

        verify(loginLockoutService).recordSuccess("realuser");
        verify(loginLockoutService, never()).recordFailure(anyString());
    }

    @Test
    void verifyLoginOtpRefusesABlockedAccountWithoutCheckingTheCode() {
        when(loginLockoutService.lockedUntil("realuser")).thenReturn(LocalDateTime.now().plusHours(2));

        ResponseEntity<?> result = authController.verifyLoginOtp(otpBody("realuser", "123456"), request);

        assertEquals(HttpStatus.LOCKED, result.getStatusCode());
        verifyNoInteractions(loginOtpService);
        verifyNoInteractions(jwtUtil);
    }
}
