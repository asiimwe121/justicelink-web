package lcdjp.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserRoleRepositoryTest {

    private JdbcTemplate jdbcTemplate;
    private UserRoleRepository repository;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        repository = new UserRoleRepository(jdbcTemplate);
    }

    private void stubRole(String username, Object role) {
        Map<String, Object> row = new HashMap<>();
        row.put("role", role);
        when(jdbcTemplate.queryForList("SELECT role FROM users WHERE username = ?", username))
                .thenReturn(List.of(row));
    }

    @Test
    void findRole_returnsTheStoredRole() {
        stubRole("mary", "District Admin");

        assertEquals("District Admin", repository.findRole("mary"));
    }

    @Test
    void findRole_isNullForUnknownUserOrNullRole() {
        when(jdbcTemplate.queryForList("SELECT role FROM users WHERE username = ?", "ghost"))
                .thenReturn(List.of());
        stubRole("norole", null);

        assertNull(repository.findRole("ghost"));
        assertNull(repository.findRole("norole"));
    }

    @Test
    void isAdministrator_followsTheSharedRoleRule() {
        stubRole("boss", "SYSTEM_ADMIN");
        stubRole("citizen1", "Citizen");

        assertTrue(repository.isAdministrator("boss"));
        assertFalse(repository.isAdministrator("citizen1"));
    }
}
