package lcdjp.admin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceAdminViewTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private AuditLogService service;

    @Test
    void logAdminCaseView_writesAnAuditRow() {
        service.logAdminCaseView("admin1", "SYSTEM_ADMIN", "C-1", "case");
        verify(jdbcTemplate).update(contains("INSERT INTO audit_logs"),
                eq("admin1"), eq("SYSTEM_ADMIN"), eq("ADMIN_CASE_VIEW"), eq("case"),
                eq("C-1"), eq("scope=case"), isNull(), isNull());
    }

    @Test
    void logAdminCaseView_failsLoudlyWhenTheWriteFails() {
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenThrow(new RuntimeException("db down"));
        assertThrows(IllegalStateException.class,
                () -> service.logAdminCaseView("admin1", "SYSTEM_ADMIN", "C-1", "case"));
    }

    @Test
    void getCaseAccessLog_returnsRows() {
        List<Map<String, Object>> rows = List.of(Map.of("username", "admin1"));
        when(jdbcTemplate.queryForList(anyString(), eq("ADMIN_CASE_VIEW"), eq("C-1"))).thenReturn(rows);
        assertEquals(rows, service.getCaseAccessLog("C-1"));
    }
}
