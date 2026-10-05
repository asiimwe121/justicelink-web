package lcdjp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountRetentionServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private UserCaseCleanupService userCaseCleanupService;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private AccountRetentionService service;

    private final LocalDateTime cutoff = LocalDateTime.of(2026, 4, 3, 2, 30);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "retentionMonths", 6);
    }

    private Map<String, Object> row(String username, String role) {
        Map<String, Object> m = new HashMap<>();
        m.put("username", username);
        m.put("role", role);
        return m;
    }

    @Test
    void removesAccountsDeactivatedBeforeTheCutoff_andAudits() {
        when(jdbcTemplate.queryForList(contains("deactivated_at <= ?"), eq(cutoff)))
                .thenReturn(List.of(row("jdoe", "Citizen")));
        when(userCaseCleanupService.purgeUserCaseData("jdoe")).thenReturn(2);
        when(jdbcTemplate.update(contains("DELETE FROM users"), eq("jdoe"), eq(cutoff))).thenReturn(1);

        int removed = service.purgeDeactivatedBefore(cutoff);

        assertEquals(1, removed);
        verify(auditLogService).logAction(eq("jdoe"), eq("System"), eq("USER_AUTO_DELETED"),
                eq("user"), eq("jdoe"), anyString());
    }

    @Test
    void neverRemovesTheSystemAdministrator() {
        when(jdbcTemplate.queryForList(anyString(), eq(cutoff)))
                .thenReturn(List.of(row("system_admin", "SYSTEM_ADMIN"), row("root2", "System Admin")));

        int removed = service.purgeDeactivatedBefore(cutoff);

        assertEquals(0, removed);
        verify(userCaseCleanupService, never()).purgeUserCaseData(anyString());
        verify(jdbcTemplate, never()).update(contains("DELETE FROM users"), any(Object[].class));
    }

    @Test
    void accountReactivatedMidRun_isNotCountedOrAudited() {
        when(jdbcTemplate.queryForList(anyString(), eq(cutoff))).thenReturn(List.of(row("jdoe", "Citizen")));
        when(jdbcTemplate.update(contains("DELETE FROM users"), eq("jdoe"), eq(cutoff))).thenReturn(0);

        int removed = service.purgeDeactivatedBefore(cutoff);

        assertEquals(0, removed);
        verify(auditLogService, never()).logAction(anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void oneFailureDoesNotStopTheRestOfTheBatch() {
        when(jdbcTemplate.queryForList(anyString(), eq(cutoff)))
                .thenReturn(List.of(row("bad", "Citizen"), row("good", "Citizen")));
        when(userCaseCleanupService.purgeUserCaseData("bad")).thenThrow(new RuntimeException("boom"));
        when(userCaseCleanupService.purgeUserCaseData("good")).thenReturn(0);
        when(jdbcTemplate.update(contains("DELETE FROM users"), eq("good"), eq(cutoff))).thenReturn(1);

        assertEquals(1, service.purgeDeactivatedBefore(cutoff));
    }
}
