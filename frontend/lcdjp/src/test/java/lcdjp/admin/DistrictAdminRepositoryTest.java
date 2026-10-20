package lcdjp.admin;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DistrictAdminRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final DistrictAdminRepository repository = new DistrictAdminRepository(jdbcTemplate);

    @Test
    void usernameExists_isTrueOnlyForPositiveCount() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("taken"))).thenReturn(1);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("free"))).thenReturn(0);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("odd"))).thenReturn(null);

        assertTrue(repository.usernameExists("taken"));
        assertFalse(repository.usernameExists("free"));
        assertFalse(repository.usernameExists("odd"));
    }

    @Test
    void insertDistrictAdmin_bindsValuesInColumnOrder() {
        repository.insertDistrictAdmin("jane", "hash", "Jane", "Doe", "j@x.org", "0700", "Kampala");

        verify(jdbcTemplate).update(
                eq("INSERT INTO users (username, password_hash, first_name, last_name, role, " +
                        "email, phone, district, approval_status, is_active, user_type, password_changed, created_at) " +
                        "VALUES (?, ?, ?, ?, 'DISTRICT_ADMIN', ?, ?, ?, 'Approved', 1, 'individual', 0, NOW())"),
                eq("jane"), eq("hash"), eq("Jane"), eq("Doe"), eq("j@x.org"), eq("0700"), eq("Kampala"));
    }

    @Test
    void findAll_andFindByDistrict_readDistrictAdminRows() {
        List<Map<String, Object>> rows = List.of(Map.of("username", "a"));
        when(jdbcTemplate.queryForList(contains("role = 'DISTRICT_ADMIN'"))).thenReturn(rows);
        when(jdbcTemplate.queryForList(contains("AND district = ?"), eq("Gulu"))).thenReturn(rows);

        assertEquals(rows, repository.findAll());
        assertEquals(rows, repository.findByDistrict("Gulu"));
    }

    @Test
    void count_treatsNullAsZero() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(null).thenReturn(4);

        assertEquals(0, repository.count());
        assertEquals(4, repository.count());
    }

    @Test
    void countByDistrict_groupsAndOrdersByDistrict() {
        List<Map<String, Object>> rows = List.of(Map.of("district", "Gulu", "count", 1));
        when(jdbcTemplate.queryForList(contains("GROUP BY district ORDER BY district"))).thenReturn(rows);

        assertEquals(rows, repository.countByDistrict());
    }
}
