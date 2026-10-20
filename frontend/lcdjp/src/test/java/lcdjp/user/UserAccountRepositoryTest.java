package lcdjp.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserAccountRepositoryTest {

    private JdbcTemplate jdbcTemplate;
    private UserAccountRepository repository;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        repository = new UserAccountRepository(jdbcTemplate);
    }

    @Test
    void findResetTarget_returnsFirstRowOrNull() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("username", "mary");
        when(jdbcTemplate.queryForList(contains("FROM users WHERE username = ?"), eq("mary")))
                .thenReturn(List.of(row));
        when(jdbcTemplate.queryForList(contains("FROM users WHERE username = ?"), eq("ghost")))
                .thenReturn(List.of());

        assertSame(row, repository.findResetTarget("mary"));
        assertNull(repository.findResetTarget("ghost"));
    }

    @Test
    void findProfile_returnsFirstRowOrNull() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("username", "alice");
        when(jdbcTemplate.queryForList(contains("verification_rejection_reason"), eq("alice")))
                .thenReturn(List.of(row));
        when(jdbcTemplate.queryForList(contains("verification_rejection_reason"), eq("ghost")))
                .thenReturn(List.of());

        assertSame(row, repository.findProfile("alice"));
        assertNull(repository.findProfile("ghost"));
    }

    @Test
    void findDistrictAdmins_bindsTheDistrict() {
        repository.findDistrictAdmins("Kampala");

        verify(jdbcTemplate).queryForList(contains("SELECT username, approval_status, is_active"), eq("Kampala"));
    }

    @Test
    void countByUsername_delegatesToCountQuery() {
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*) FROM users WHERE username = ?"),
                eq(Integer.class), eq("bob"))).thenReturn(2);

        assertEquals(2, repository.countByUsername("bob"));
    }

    @Test
    void countOtherUsersWithEmail_bindsEmailThenExcludedUsername() {
        when(jdbcTemplate.queryForObject(contains("username <> ?"), eq(Integer.class),
                eq("a@example.com"), eq("alice"))).thenReturn(1);

        assertEquals(1, repository.countOtherUsersWithEmail("a@example.com", "alice"));
    }

    @Test
    void insertLcAccount_bindsAllThirteenParametersInOrder() {
        repository.insertLcAccount("lc1", "hash", "New", "LC", "a@example.com", "+256700000000",
                "Kampala", "Kisenyi", "Kisenyi II", "Central", "LC1", null, null);

        verify(jdbcTemplate).update(contains("INSERT INTO users"), eq("lc1"), eq("hash"), eq("New"), eq("LC"),
                eq("a@example.com"), eq("+256700000000"), eq("Kampala"), eq("Kisenyi"), eq("Kisenyi II"),
                eq("Central"), eq("LC1"), eq((Object) null), eq((Object) null));
    }

    @Test
    void updateProfileColumns_buildsSetClauseInInsertionOrderAndAppendsUsernameLast() {
        Map<String, Object> columns = new LinkedHashMap<>();
        columns.put("phone", "0700");
        columns.put("sub_county", "Nakawa");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        int updated = repository.updateProfileColumns("alice", columns);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(sql.capture(), params.capture());
        assertEquals(1, updated);
        assertEquals("UPDATE users SET phone = ?, sub_county = ? WHERE username = ?", sql.getValue());
        assertEquals(List.of("0700", "Nakawa", "alice"), List.of(params.getValue()));
    }

    @Test
    void updateProfileColumns_rejectsColumnsOutsideTheWhitelist() {
        Map<String, Object> columns = new LinkedHashMap<>();
        columns.put("role", "SYSTEM_ADMIN");

        assertThrows(IllegalArgumentException.class, () -> repository.updateProfileColumns("alice", columns));
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void updateProfileColumns_rejectsAnEmptyUpdate() {
        assertThrows(IllegalArgumentException.class,
                () -> repository.updateProfileColumns("alice", new LinkedHashMap<>()));
    }

    @Test
    void findDisplayName_readsConcatenatedName() {
        when(jdbcTemplate.queryForObject(contains("CONCAT(first_name"), eq(String.class), eq("bob")))
                .thenReturn("Bob Smith");

        assertEquals("Bob Smith", repository.findDisplayName("bob"));
    }

    @Test
    void findRole_readsRoleColumn() {
        when(jdbcTemplate.queryForObject(contains("SELECT role FROM users"), eq(String.class), eq("bob")))
                .thenReturn("Lawyer");

        assertEquals("Lawyer", repository.findRole("bob"));
    }

    @Test
    void findVerificationDistrictAdmin_returnsFirstUsernameOrNull() {
        when(jdbcTemplate.queryForList(contains("DISTRICT_ADMIN"), eq(String.class), eq("Kampala")))
                .thenReturn(List.of("kampala_admin"));
        when(jdbcTemplate.queryForList(contains("DISTRICT_ADMIN"), eq(String.class), eq("Gulu")))
                .thenReturn(List.of());

        assertEquals("kampala_admin", repository.findVerificationDistrictAdmin("Kampala"));
        assertNull(repository.findVerificationDistrictAdmin("Gulu"));
    }

    @Test
    void findSystemAdminUsername_returnsFirstUsernameOrNull() {
        when(jdbcTemplate.queryForList(contains("SYSTEM_ADMIN"), eq(String.class)))
                .thenReturn(List.of("root_admin"))
                .thenReturn(List.of());

        assertEquals("root_admin", repository.findSystemAdminUsername());
        assertNull(repository.findSystemAdminUsername());
    }

    @Test
    void countDistrictAdminsInDistrict_treatsNullAsZero() {
        when(jdbcTemplate.queryForObject(contains("LOWER(TRIM(district))"), eq(Integer.class), eq("Kampala")))
                .thenReturn(2)
                .thenReturn(null);

        assertEquals(2, repository.countDistrictAdminsInDistrict("Kampala"));
        assertEquals(0, repository.countDistrictAdminsInDistrict("Kampala"));
    }

    @Test
    void findPendingVerificationRequests_scopesToDistrictOnlyWhenGiven() {
        List<Map<String, Object>> all = List.of(Map.of("username", "a"));
        List<Map<String, Object>> scoped = List.of(Map.of("username", "b"));
        when(jdbcTemplate.queryForList(argThat((String sql) -> sql.contains("PENDING") && !sql.contains("LOWER(TRIM(district))"))))
                .thenReturn(all);
        when(jdbcTemplate.queryForList(contains("LOWER(TRIM(district)) = LOWER(TRIM(?))"), eq("Kampala")))
                .thenReturn(scoped);

        assertEquals(all, repository.findPendingVerificationRequests(null));
        assertEquals(scoped, repository.findPendingVerificationRequests("Kampala"));
    }

    @Test
    void markUnverifiedUsersVerified_returnsRowsChanged() {
        when(jdbcTemplate.update(contains("SET verification_status = 'VERIFIED'"))).thenReturn(7);

        assertEquals(7, repository.markUnverifiedUsersVerified());
    }
}
