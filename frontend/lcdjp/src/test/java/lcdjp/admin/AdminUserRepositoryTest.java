package lcdjp.admin;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminUserRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AdminUserRepository repository = new AdminUserRepository(jdbcTemplate);

    private int runUpdate(String username, Map<String, Object> columns, ArgumentCaptor<String> sql,
                          ArgumentCaptor<Object[]> params) {
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        int updated = repository.updateUser(username, columns);
        verify(jdbcTemplate).update(sql.capture(), params.capture());
        return updated;
    }

    @Test
    void updateUser_setsColumnsInOrderAndFiltersByUsername() {
        Map<String, Object> columns = new LinkedHashMap<>();
        columns.put("first_name", "Jane");
        columns.put("phone", "0700");
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);

        assertEquals(1, runUpdate("jdoe", columns, sql, params));

        assertEquals("UPDATE users SET first_name = ?, phone = ? WHERE username = ?", sql.getValue());
        assertArrayEquals(new Object[] {"Jane", "0700", "jdoe"}, params.getValue());
    }

    @Test
    void updateUser_deactivating_keepsOrStampsDeactivatedAt() {
        Map<String, Object> columns = new LinkedHashMap<>();
        columns.put("approval_status", "Disabled");
        columns.put("is_active", false);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);

        runUpdate("jdoe", columns, sql, params);

        assertEquals("UPDATE users SET approval_status = ?, " +
                "is_active = ?, deactivated_at = COALESCE(deactivated_at, CURRENT_TIMESTAMP) WHERE username = ?",
                sql.getValue());
        assertArrayEquals(new Object[] {"Disabled", false, "jdoe"}, params.getValue());
    }

    @Test
    void updateUser_reactivating_clearsDeactivatedAt() {
        Map<String, Object> columns = new LinkedHashMap<>();
        columns.put("is_active", true);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);

        runUpdate("jdoe", columns, sql, params);

        assertEquals("UPDATE users SET is_active = ?, deactivated_at = NULL WHERE username = ?", sql.getValue());
    }

    @Test
    void updateUser_rejectsColumnsThatAreNotWhitelisted() {
        Map<String, Object> columns = new LinkedHashMap<>();
        columns.put("first_name = 'x', role", "Admin");

        assertThrows(IllegalArgumentException.class, () -> repository.updateUser("jdoe", columns));
        assertThrows(IllegalArgumentException.class, () -> repository.updateUser("jdoe", Map.of("role", "Admin")));
        assertThrows(IllegalArgumentException.class, () -> repository.updateUser("jdoe", Map.of("password_hash", "x")));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void updateUser_withNothingToChange_isRejected() {
        assertThrows(IllegalArgumentException.class, () -> repository.updateUser("jdoe", Map.of()));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void findDistrict_isNullWhenMissing() {
        when(jdbcTemplate.queryForList(contains("SELECT district"), eq(String.class), eq("ghost"))).thenReturn(List.of());
        when(jdbcTemplate.queryForList(contains("SELECT district"), eq(String.class), eq("jdoe"))).thenReturn(List.of("Gulu"));

        assertNull(repository.findDistrict("ghost"));
        assertEquals("Gulu", repository.findDistrict("jdoe"));
    }

    @Test
    void pendingLists_scopeToDistrictOnlyWhenGiven() {
        repository.findPendingApprovals(null);
        repository.findPendingApprovals("Kampala");
        repository.findPendingVerificationSummaries("Gulu");

        verify(jdbcTemplate).queryForList(argThat((String q) -> q.endsWith("verification_status = 'PENDING'")));
        verify(jdbcTemplate).queryForList(argThat((String q) -> q.contains("LOWER(TRIM(district)) = LOWER(TRIM(?))")),
                eq("Kampala"));
        verify(jdbcTemplate).queryForList(argThat((String q) -> q.contains("requested_role FROM users")
                && q.contains("LOWER(TRIM(district))")), eq("Gulu"));
    }

    @Test
    void booleanChecks_treatNullAsFalse() {
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*) FROM users WHERE username = ?"),
                eq(Integer.class), eq("a"))).thenReturn(1).thenReturn(null);
        when(jdbcTemplate.queryForObject(contains("LOWER(email) = LOWER(?)"), eq(Integer.class), eq("e@x.org"), eq("a")))
                .thenReturn(1).thenReturn(0);

        assertTrue(repository.userExists("a"));
        assertFalse(repository.userExists("a"));
        assertTrue(repository.emailUsedByAnotherUser("e@x.org", "a"));
        assertFalse(repository.emailUsedByAnotherUser("e@x.org", "a"));
    }

    @Test
    void listings_excludeTheSystemAdminAccount() {
        repository.listAllUsers();
        repository.listAllUsersPage(10, 20);
        repository.listUsersInDistrict("Kampala");

        verify(jdbcTemplate).queryForList(argThat((String q) -> q.endsWith("WHERE username != 'system_admin'")));
        verify(jdbcTemplate).queryForList(argThat((String q) -> q.endsWith("LIMIT ? OFFSET ?")), eq(10), eq(20));
        verify(jdbcTemplate).queryForList(argThat((String q) -> q.contains("WHERE district = ? AND username != 'system_admin'")),
                eq("Kampala"));
    }
}
