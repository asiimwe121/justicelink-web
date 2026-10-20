package lcdjp.auth;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AuthRepository repository = new AuthRepository(jdbcTemplate);

    @Test
    void findRole_isNullForUnknownUser() {
        when(jdbcTemplate.queryForList(contains("SELECT role"), eq(String.class), eq("ghost"))).thenReturn(List.of());
        when(jdbcTemplate.queryForList(contains("SELECT role"), eq(String.class), eq("bob"))).thenReturn(List.of("Admin"));

        assertNull(repository.findRole("ghost"));
        assertEquals("Admin", repository.findRole("bob"));
    }

    @Test
    void userLookups_bindTheUsername() {
        List<Map<String, Object>> rows = List.of(Map.of("username", "bob"));
        when(jdbcTemplate.queryForList(eq("SELECT * FROM users WHERE username = ?"), eq("bob"))).thenReturn(rows);

        assertEquals(rows, repository.findUserByUsername("bob"));
        repository.findContactAndRole("bob");
        repository.findPasswordHash("bob");
        verify(jdbcTemplate).queryForList(eq("SELECT email, phone, role FROM users WHERE username = ?"), eq("bob"));
        verify(jdbcTemplate).queryForList(eq("SELECT password_hash FROM users WHERE username = ?"), eq("bob"));
    }

    @Test
    void findAuditLogs_withoutFilters_isCappedAndUnfiltered() {
        repository.findAuditLogs(null, "");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sql.capture(), any(Object[].class));
        assertEquals("SELECT * FROM audit_logs WHERE 1=1 ORDER BY created_at DESC LIMIT 100", sql.getValue());
    }

    @Test
    void findAuditLogs_filtersAreBoundNeverConcatenated() {
        repository.findAuditLogs("bob", "x'; DROP TABLE audit_logs;--");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).queryForList(sql.capture(), params.capture());
        assertEquals("SELECT * FROM audit_logs WHERE 1=1 AND username = ? AND action = ? ORDER BY created_at DESC LIMIT 100",
                sql.getValue());
        assertArrayEquals(new Object[] {"bob", "x'; DROP TABLE audit_logs;--"}, params.getValue());
    }

    @Test
    void pingDatabase_propagatesFailures() {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenThrow(new RuntimeException("down"));

        assertThrows(RuntimeException.class, repository::pingDatabase);
    }
}
