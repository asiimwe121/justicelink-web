package lcdjp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PasswordResetLinkServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private EmailService emailService;
    @Mock private SmsService smsService;
    @Mock private LoginLockoutService loginLockoutService;
    @Mock private SessionRevocationService sessionRevocationService;
    @InjectMocks private PasswordResetLinkService service;

    @BeforeEach
    void config() {
        ReflectionTestUtils.setField(service, "baseUrl", "https://justicelinkug.org/");
        ReflectionTestUtils.setField(service, "supportEmail", "support@justicelinkug.org");
        ReflectionTestUtils.setField(service, "supportName", "JusticeLink Support");
        ReflectionTestUtils.setField(service, "linkTtlMinutes", 60L);
    }

    private Map<String, Object> user(String email, String phone) {
        Map<String, Object> u = new HashMap<>();
        u.put("username", "jane");
        u.put("first_name", "Jane");
        u.put("email", email);
        u.put("phone", phone);
        return u;
    }

    @Test
    void tokensAreLongRandomAndUrlSafe() throws Exception {
        String a = PasswordResetLinkService.newToken();
        String b = PasswordResetLinkService.newToken();
        assertNotEquals(a, b);
        assertTrue(a.length() >= 43);
        assertTrue(a.matches("[A-Za-z0-9_-]+"));
    }

    @Test
    void onlyAHashIsStoredNeverTheToken() throws Exception {
        service.issueAndSend(user("jane@example.test", ""), "admin");

        ArgumentCaptorHolder.assertInsertedHashIsNotRawToken(jdbcTemplate, emailService);
    }

    @Test
    void linkPointsAtResetPageWithoutDoubleSlash() throws Exception {
        assertEquals("https://justicelinkug.org/reset-password.html?token=abc", service.linkFor("abc"));
    }

    @Test
    void sendsEmailFromSupportAndSmsWhenBothOnFile() throws Exception {
        PasswordResetLinkService.DeliveryResult r = service.issueAndSend(user("jane@example.test", "0700000000"), "admin");

        assertTrue(r.emailSent);
        assertTrue(r.smsSent);
        verify(emailService).sendEmailFrom(eq("support@justicelinkug.org"), eq("JusticeLink Support"),
                eq("jane@example.test"), anyString(), contains("Reset my password"));
        verify(smsService).sendSms(eq("0700000000"), contains("reset-password.html?token="));
    }

    @Test
    void undeliverableLinkIsRevokedAgain() throws Exception {
        doThrow(new RuntimeException("smtp down")).when(emailService)
                .sendEmailFrom(anyString(), anyString(), anyString(), anyString(), anyString());

        PasswordResetLinkService.DeliveryResult r = service.issueAndSend(user("jane@example.test", ""), "admin");

        assertFalse(r.anySent());
        verify(jdbcTemplate).update(contains("SET used_at = ? WHERE token_hash = ?"), any(LocalDateTime.class), anyString());
    }

    @Test
    void blankOrMissingTokenIsNeverValid() throws Exception {
        assertNull(service.findValidUsername(null));
        assertNull(service.findValidUsername("   "));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void completingAResetSetsPasswordAndLiftsTheLoginBlock() throws Exception {
        when(jdbcTemplate.queryForList(contains("SELECT username FROM password_reset_links"), ArgumentMatchers.<Object>any(), ArgumentMatchers.<Object>any()))
                .thenReturn(List.of(Map.of("username", "jane")));
        when(jdbcTemplate.update(contains("SET used_at = ? WHERE token_hash = ?"), any(), any(), any())).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE users SET password_hash"), any(), any(), any())).thenReturn(1);

        assertEquals("jane", service.completeReset("tok", "newhash"));
        verify(loginLockoutService).unlock("jane");
        verify(sessionRevocationService).revokeAll("jane");
    }

    @Test
    void aLinkSpentByAnotherRequestCannotBeUsedTwice() throws Exception {
        when(jdbcTemplate.queryForList(contains("SELECT username FROM password_reset_links"), ArgumentMatchers.<Object>any(), ArgumentMatchers.<Object>any()))
                .thenReturn(List.of(Map.of("username", "jane")));
        when(jdbcTemplate.update(contains("SET used_at = ? WHERE token_hash = ?"), any(), any(), any())).thenReturn(0);

        assertNull(service.completeReset("tok", "newhash"));
        verify(jdbcTemplate, never()).update(contains("UPDATE users SET password_hash"), any(), any(), any());
        verifyNoInteractions(loginLockoutService);
        verifyNoInteractions(sessionRevocationService);
    }

    private static final class ArgumentCaptorHolder {
        static void assertInsertedHashIsNotRawToken(JdbcTemplate jdbc, EmailService email) throws Exception {
            org.mockito.ArgumentCaptor<String> body = org.mockito.ArgumentCaptor.forClass(String.class);
            verify(email).sendEmailFrom(anyString(), anyString(), anyString(), anyString(), body.capture());
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(body.getValue());
            assertTrue(m.find(), "email must contain the link");
            String rawToken = m.group(1);

            org.mockito.ArgumentCaptor<Object> args = org.mockito.ArgumentCaptor.forClass(Object.class);
            verify(jdbc).update(startsWith("INSERT INTO password_reset_links"),
                    args.capture(), args.capture(), args.capture(), args.capture(), args.capture());
            assertFalse(args.getAllValues().contains(rawToken), "raw token must not be stored");
            assertTrue(args.getAllValues().contains(PasswordResetLinkService.hash(rawToken)));
        }
    }
}
