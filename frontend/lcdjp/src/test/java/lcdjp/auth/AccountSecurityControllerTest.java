package lcdjp.auth;

import lcdjp.admin.AuditLogService;
import lcdjp.notification.EmailService;
import lcdjp.security.JwtUtil;
import lcdjp.security.LoginLockoutService;
import lcdjp.security.OtpConfig;
import lcdjp.security.SessionRevocationService;
import lcdjp.notification.SmsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountSecurityControllerTest {

    @Mock private AccountSecurityRepository accountSecurity;
    @Mock private AuditLogService auditLogService;
    @Mock private EmailService emailService;
    @Mock private SmsService smsService;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private LoginLockoutService loginLockoutService;
    @Mock private SessionRevocationService sessionRevocationService;
    @Mock private HttpServletRequest httpRequest;
    @Mock private HttpSession session;

    @InjectMocks
    private AccountSecurityController controller;

    private static final String SIX_DIGITS = "\\d{6}";

    @Test
    void forgotPassword_unknownAccount_returnsGenericSuccess_andWritesNothing() throws Exception {
        when(accountSecurity.findUsernameAndEmail("nobody", "nobody@x.com"))
                .thenReturn(List.of());

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setUsername("nobody");
        req.setEmail("nobody@x.com");

        ResponseEntity<?> result = controller.forgotPassword(req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue((Boolean) ((Map<?, ?>) result.getBody()).get("success"));
        verify(accountSecurity, never()).insertResetToken(any(), any(), any());
        verifyNoInteractions(emailService);
    }

    @Test
    void forgotPassword_knownAccount_invalidatesOldTokens_createsNewOne_andEmailsSameCode() throws Exception {
        when(accountSecurity.findUsernameAndEmail("jdoe", "jdoe@example.com"))
                .thenReturn(List.of(Map.of("username", "jdoe", "email", "jdoe@example.com")));

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setUsername("jdoe");
        req.setEmail("jdoe@example.com");

        ResponseEntity<?> result = controller.forgotPassword(req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(accountSecurity).invalidateOpenResetTokens("jdoe");

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(accountSecurity).insertResetToken(eq("jdoe"), codeCaptor.capture(), any(LocalDateTime.class));
        assertTrue(codeCaptor.getValue().matches(SIX_DIGITS));

        verify(auditLogService).logAction(eq("jdoe"), eq("User"), eq("PASSWORD_RESET_REQUESTED"),
                eq("user"), eq("jdoe"), anyString());

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("jdoe@example.com"), anyString(), bodyCaptor.capture());
        assertTrue(bodyCaptor.getValue().contains(codeCaptor.getValue()));
    }

    @Test
    void forgotPassword_emailSendFails_stillReturnsGenericSuccess() throws Exception {
        when(accountSecurity.findUsernameAndEmail("jdoe", "jdoe@example.com"))
                .thenReturn(List.of(Map.of("username", "jdoe", "email", "jdoe@example.com")));
        doThrow(new IOException("brevo down")).when(emailService).sendEmail(anyString(), anyString(), anyString());

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setUsername("jdoe");
        req.setEmail("jdoe@example.com");

        ResponseEntity<?> result = controller.forgotPassword(req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue((Boolean) ((Map<?, ?>) result.getBody()).get("success"));
    }

    @Test
    void resetPassword_missingCodeAndToken_isBadRequest() {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setUsername("jdoe");
        req.setNewPassword("newpassword1");
        req.setConfirmPassword("newpassword1");

        ResponseEntity<?> result = controller.resetPassword(req);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void resetPassword_passwordsDontMatch_isBadRequest() {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setUsername("jdoe");
        req.setCode("123456");
        req.setNewPassword("newpassword1");
        req.setConfirmPassword("somethingElse");

        ResponseEntity<?> result = controller.resetPassword(req);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        assertEquals("Passwords do not match", ((Map<?, ?>) result.getBody()).get("error"));
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void resetPassword_invalidOrExpiredCode_isBadRequest_andDoesNotTouchPassword() {
        when(accountSecurity.findValidResetToken("jdoe", "999999")).thenReturn(List.of());

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setUsername("jdoe");
        req.setCode("999999");
        req.setNewPassword("newpassword1");
        req.setConfirmPassword("newpassword1");

        ResponseEntity<?> result = controller.resetPassword(req);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(accountSecurity, never()).updatePasswordHash(any(), any());
        verify(loginLockoutService, never()).unlock(anyString());
        verify(sessionRevocationService, never()).revokeAll(anyString());
    }

    @Test
    void resetPassword_validCode_updatesPassword_marksTokenUsed_andLogsAudit() {
        when(accountSecurity.findValidResetToken("jdoe", "123456"))
                .thenReturn(List.of(Map.of("username", "jdoe")));
        when(passwordEncoder.encode("newpassword1")).thenReturn("hashedvalue");

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setUsername("jdoe");
        req.setCode("123456");
        req.setNewPassword("newpassword1");
        req.setConfirmPassword("newpassword1");

        ResponseEntity<?> result = controller.resetPassword(req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(accountSecurity).updatePasswordHash("jdoe", "hashedvalue");
        verify(accountSecurity).markResetTokenUsed("jdoe", "123456");
        verify(auditLogService).logAction(eq("jdoe"), eq("User"), eq("PASSWORD_RESET_COMPLETED"),
                eq("user"), eq("jdoe"), anyString());
        verify(loginLockoutService).unlock("jdoe");
        verify(sessionRevocationService).revokeAll("jdoe");
    }

    @Test
    void resetPassword_fallsBackToResetTokenField_whenCodeIsAbsent() {
        when(accountSecurity.findValidResetToken("jdoe", "654321"))
                .thenReturn(List.of(Map.of("username", "jdoe")));
        when(passwordEncoder.encode(anyString())).thenReturn("hashedvalue");

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setUsername("jdoe");
        req.setResetToken("654321");
        req.setNewPassword("newpassword1");
        req.setConfirmPassword("newpassword1");

        ResponseEntity<?> result = controller.resetPassword(req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(accountSecurity).markResetTokenUsed(eq("jdoe"), eq("654321"));
    }

    @Test
    void resetPassword_dbFailure_returns500() {
        when(accountSecurity.findValidResetToken(anyString(), anyString()))
                .thenThrow(new RuntimeException("db down"));

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setUsername("jdoe");
        req.setCode("123456");
        req.setNewPassword("newpassword1");
        req.setConfirmPassword("newpassword1");

        ResponseEntity<?> result = controller.resetPassword(req);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
    }

    private UsernameRequest usernameRequest(String username) {
        UsernameRequest req = new UsernameRequest();
        req.setUsername(username);
        return req;
    }

    @Test
    void sendOtp_pendingRegistration_usernameMismatch_isBadRequest() {
        when(httpRequest.getSession(false)).thenReturn(session);
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "someoneelse");
        pending.put("email", "x@example.com");
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);

        ResponseEntity<?> result = controller.sendOtp(usernameRequest("jdoe"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void sendOtp_pendingRegistration_noEmailOnPending_isBadRequest() {
        when(httpRequest.getSession(false)).thenReturn(session);
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "jdoe");
        pending.put("email", "  ");
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);

        ResponseEntity<?> result = controller.sendOtp(usernameRequest("jdoe"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void sendOtp_pendingRegistration_cooldownActive_isTooManyRequests() {
        when(httpRequest.getSession(false)).thenReturn(session);
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "jdoe");
        pending.put("email", "jdoe@example.com");
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);
        when(session.getAttribute("lcdjp_pending_otp_sent_at")).thenReturn(System.currentTimeMillis());

        ResponseEntity<?> result = controller.sendOtp(usernameRequest("jdoe"), httpRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void sendOtp_pendingRegistration_happyPath_setsSessionAndEmailsSameCode() throws Exception {
        when(httpRequest.getSession(false)).thenReturn(session);
        Map<String, Object> pending = new HashMap<>();
        pending.put("username", "jdoe");
        pending.put("email", "jdoe@example.com");
        when(session.getAttribute("lcdjp_pending_registration")).thenReturn(pending);
        when(session.getAttribute("lcdjp_pending_otp_sent_at")).thenReturn(null);

        ResponseEntity<?> result = controller.sendOtp(usernameRequest("jdoe"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(session).setAttribute(eq("lcdjp_pending_otp"), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches(SIX_DIGITS));
        verify(session).setAttribute(eq("lcdjp_pending_otp_attempts"), eq(0));

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("jdoe@example.com"), anyString(), bodyCaptor.capture());
        assertTrue(bodyCaptor.getValue().contains(otpCaptor.getValue()));
    }

    @Test
    void sendOtp_noPendingRegistration_unknownUser_returns404() {
        when(httpRequest.getSession(false)).thenReturn(null);
        when(accountSecurity.findEmail("ghost")).thenReturn(List.of());

        ResponseEntity<?> result = controller.sendOtp(usernameRequest("ghost"), httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void sendOtp_noPendingRegistration_knownUser_sendsLegacyOtp_inNewSession() throws Exception {
        when(httpRequest.getSession(false)).thenReturn(null);
        when(accountSecurity.findEmail("jdoe"))
                .thenReturn(List.of(Map.of("email", "jdoe@example.com")));
        when(httpRequest.getSession(true)).thenReturn(session);

        ResponseEntity<?> result = controller.sendOtp(usernameRequest("jdoe"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(session).setAttribute("lcdjp_legacy_otp_username", "jdoe");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(session).setAttribute(eq("lcdjp_legacy_otp"), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches(SIX_DIGITS));

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("jdoe@example.com"), anyString(), bodyCaptor.capture());
        assertTrue(bodyCaptor.getValue().contains(otpCaptor.getValue()));
    }

    private ChangePasswordRequest changePasswordRequest(String current, String next, String confirm) {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword(current);
        req.setNewPassword(next);
        req.setConfirmPassword(confirm);
        return req;
    }

    @Test
    void changePassword_missingAuthHeader_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("old", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void changePassword_invalidToken_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer badtoken");
        when(jwtUtil.extractUsername("badtoken")).thenThrow(new RuntimeException("malformed"));

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("old", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void changePassword_confirmDoesNotMatch_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("old", "newpassword1", "mismatch"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void changePassword_userNotFound_returns404() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("ghost");
        when(accountSecurity.findCredentials("ghost")).thenReturn(List.of());

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("old", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void changePassword_wrongCurrentPassword_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(accountSecurity.findCredentials("jdoe")).thenReturn(List.of(
                Map.of("password_hash", "storedhash", "email", "jdoe@example.com", "phone", "")));
        when(passwordEncoder.matches("wrongpass", "storedhash")).thenReturn(false);

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("wrongpass", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(emailService);
    }

    @Test
    void changePassword_noContactInfoOnFile_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        Map<String, Object> row = new HashMap<>();
        row.put("password_hash", "storedhash");
        row.put("email", "");
        row.put("phone", null);
        when(accountSecurity.findCredentials("jdoe")).thenReturn(List.of(row));
        when(passwordEncoder.matches("oldpass", "storedhash")).thenReturn(true);

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("oldpass", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(emailService, smsService);
    }

    @Test
    void changePassword_happyPath_holdsHashPendingOtp_andEmailsCode() throws Exception {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(accountSecurity.findCredentials("jdoe")).thenReturn(List.of(
                Map.of("password_hash", "storedhash", "email", "jdoe@example.com", "phone", "")));
        when(passwordEncoder.matches("oldpass", "storedhash")).thenReturn(true);
        when(passwordEncoder.encode("newpassword1")).thenReturn("newhash");
        when(httpRequest.getSession(true)).thenReturn(session);

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("oldpass", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue((Boolean) body.get("otpRequired"));
        assertEquals("email", body.get("channel"));

        verify(session).setAttribute("lcdjp_fpc_pending_username", "jdoe");
        verify(session).setAttribute("lcdjp_fpc_pending_hash", "newhash");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(session).setAttribute(eq("lcdjp_fpc_otp_code"), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches(SIX_DIGITS));

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("jdoe@example.com"), anyString(), bodyCaptor.capture());
        assertTrue(bodyCaptor.getValue().contains(otpCaptor.getValue()));
        verifyNoInteractions(smsService);
    }

    @Test
    void changePassword_noEmail_fallsBackToSms() throws Exception {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        Map<String, Object> row = new HashMap<>();
        row.put("password_hash", "storedhash");
        row.put("email", "  ");
        row.put("phone", "+256700000000");
        when(accountSecurity.findCredentials("jdoe")).thenReturn(List.of(row));
        when(passwordEncoder.matches("oldpass", "storedhash")).thenReturn(true);
        when(passwordEncoder.encode("newpassword1")).thenReturn("newhash");
        when(httpRequest.getSession(true)).thenReturn(session);

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("oldpass", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("sms", ((Map<?, ?>) result.getBody()).get("channel"));
        verify(smsService).sendSms(eq("+256700000000"), anyString());
        verifyNoInteractions(emailService);
    }

    @Test
    void changePassword_cooldownActive_returnsTooManyRequests() throws Exception {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(accountSecurity.findCredentials("jdoe")).thenReturn(List.of(
                Map.of("password_hash", "storedhash", "email", "jdoe@example.com", "phone", "")));
        when(passwordEncoder.matches("oldpass", "storedhash")).thenReturn(true);
        when(passwordEncoder.encode("newpassword1")).thenReturn("newhash");
        when(httpRequest.getSession(true)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_otp_sent_at")).thenReturn(System.currentTimeMillis());

        ResponseEntity<?> result = controller.changePassword(
                changePasswordRequest("oldpass", "newpassword1", "newpassword1"), httpRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
        verifyNoInteractions(emailService);
        verify(session).setAttribute("lcdjp_fpc_pending_hash", "newhash");
    }

    @Test
    void resendChangePasswordOtp_missingAuthHeader_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);

        ResponseEntity<?> result = controller.resendChangePasswordOtp(httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void resendChangePasswordOtp_noPendingSession_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = controller.resendChangePasswordOtp(httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void resendChangePasswordOtp_pendingUsernameMismatch_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("someoneelse");

        ResponseEntity<?> result = controller.resendChangePasswordOtp(httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void resendChangePasswordOtp_userDisappeared_returns404() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(accountSecurity.findContact("jdoe")).thenReturn(List.of());

        ResponseEntity<?> result = controller.resendChangePasswordOtp(httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void resendChangePasswordOtp_happyPath_sendsNewCode() throws Exception {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(accountSecurity.findContact("jdoe"))
                .thenReturn(List.of(Map.of("email", "jdoe@example.com", "phone", "")));

        ResponseEntity<?> result = controller.resendChangePasswordOtp(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(emailService).sendEmail(eq("jdoe@example.com"), anyString(), anyString());
    }

    @Test
    void resendChangePasswordOtp_cooldownActive_returnsTooManyRequests() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(accountSecurity.findContact("jdoe"))
                .thenReturn(List.of(Map.of("email", "jdoe@example.com", "phone", "")));
        when(session.getAttribute("lcdjp_fpc_otp_sent_at")).thenReturn(System.currentTimeMillis());

        ResponseEntity<?> result = controller.resendChangePasswordOtp(httpRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
        verifyNoInteractions(emailService);
    }

    private OtpOnlyRequest otpOnlyRequest(String otp) {
        OtpOnlyRequest req = new OtpOnlyRequest();
        req.setOtp(otp);
        return req;
    }

    @Test
    void verifyChangePasswordOtp_missingAuthHeader_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn(null);

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void verifyChangePasswordOtp_invalidToken_returns401() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer badtoken");
        when(jwtUtil.extractUsername("badtoken")).thenThrow(new RuntimeException("malformed"));

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void verifyChangePasswordOtp_noPendingSession_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(null);

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void verifyChangePasswordOtp_pendingUsernameMismatch_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("someoneelse");
        when(session.getAttribute("lcdjp_fpc_pending_hash")).thenReturn("somehash");
        when(session.getAttribute("lcdjp_fpc_otp_username")).thenReturn("someoneelse");

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
    }

    @Test
    void verifyChangePasswordOtp_tooManyAttempts_returnsTooManyRequests() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_pending_hash")).thenReturn("newhash");
        when(session.getAttribute("lcdjp_fpc_otp_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_otp_attempts")).thenReturn(OtpConfig.MAX_OTP_ATTEMPTS);

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, result.getStatusCode());
    }

    @Test
    void verifyChangePasswordOtp_expiredCode_returns401_andClearsIt() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_pending_hash")).thenReturn("newhash");
        when(session.getAttribute("lcdjp_fpc_otp_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_otp_attempts")).thenReturn(0);
        when(session.getAttribute("lcdjp_fpc_otp_code")).thenReturn("123456");
        when(session.getAttribute("lcdjp_fpc_otp_expiry")).thenReturn(System.currentTimeMillis() - 1000);

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verify(session).removeAttribute("lcdjp_fpc_otp_code");
        verify(session).removeAttribute("lcdjp_fpc_otp_expiry");
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void verifyChangePasswordOtp_incorrectCode_returns401_andIncrementsAttempts() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_pending_hash")).thenReturn("newhash");
        when(session.getAttribute("lcdjp_fpc_otp_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_otp_attempts")).thenReturn(1);
        when(session.getAttribute("lcdjp_fpc_otp_code")).thenReturn("123456");
        when(session.getAttribute("lcdjp_fpc_otp_expiry")).thenReturn(System.currentTimeMillis() + 60_000);

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("000000"), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verify(session).setAttribute("lcdjp_fpc_otp_attempts", 2);
        verifyNoInteractions(accountSecurity);
    }

    @Test
    void verifyChangePasswordOtp_correctCode_updatesPassword_issuesNewToken_andClearsSession() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");
        when(httpRequest.getSession(false)).thenReturn(session);
        when(session.getAttribute("lcdjp_fpc_pending_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_pending_hash")).thenReturn("newhash");
        when(session.getAttribute("lcdjp_fpc_otp_username")).thenReturn("jdoe");
        when(session.getAttribute("lcdjp_fpc_otp_attempts")).thenReturn(0);
        when(session.getAttribute("lcdjp_fpc_otp_code")).thenReturn("123456");
        when(session.getAttribute("lcdjp_fpc_otp_expiry")).thenReturn(System.currentTimeMillis() + 60_000);
        when(accountSecurity.findRoleAndDistrict("jdoe"))
                .thenReturn(Map.of("role", "Citizen", "district", "Kampala"));
        when(jwtUtil.generateToken("jdoe", "Citizen", "Kampala")).thenReturn("brand-new-token");

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("123456"), httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue((Boolean) body.get("success"));
        assertEquals("brand-new-token", body.get("token"));

        verify(accountSecurity).updatePasswordHashAndMarkChanged("jdoe", "newhash");
        verify(auditLogService).logAction(eq("jdoe"), eq("User"), eq("PASSWORD_CHANGED"),
                eq("user"), eq("jdoe"), anyString());

        verify(session).removeAttribute("lcdjp_fpc_pending_username");
        verify(session).removeAttribute("lcdjp_fpc_pending_hash");
        verify(session).removeAttribute("lcdjp_fpc_otp_username");
        verify(session).removeAttribute("lcdjp_fpc_otp_code");
        verify(session).removeAttribute("lcdjp_fpc_otp_expiry");
        verify(session).removeAttribute("lcdjp_fpc_otp_sent_at");
        verify(session).removeAttribute("lcdjp_fpc_otp_attempts");
    }

    @Test
    void verifyChangePasswordOtp_malformedOtp_isBadRequest() {
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer goodtoken");
        when(jwtUtil.extractUsername("goodtoken")).thenReturn("jdoe");

        ResponseEntity<?> result = controller.verifyChangePasswordOtp(otpOnlyRequest("abc"), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(accountSecurity);
    }
}
