package lcdjp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RegistrationRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final RegistrationRepository repository = new RegistrationRepository(jdbcTemplate);

    @Test
    void counts_treatNullAsZero() {
        when(jdbcTemplate.queryForObject(contains("LOWER(email) = LOWER(?)"), eq(Integer.class), eq("bob"), eq("b@x.org")))
                .thenReturn(null).thenReturn(2);
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM users WHERE username = ?"), eq(Integer.class), eq("bob")))
                .thenReturn(1);

        assertEquals(0, repository.countByUsernameOrEmail("bob", "b@x.org"));
        assertEquals(2, repository.countByUsernameOrEmail("bob", "b@x.org"));
        assertEquals(1, repository.countByUsername("bob"));
    }

    @Test
    void insertUser_bindsTheGivenValuesAsTheOnlyParameters() {
        Object[] values = {"bob", "hash", "Bob"};

        repository.insertUser(values);

        verify(jdbcTemplate).update(startsWith("INSERT INTO users (username, password_hash, first_name"), eq(values));
    }

    @Test
    void nationalIdCheck_excludesTheAccountItself() {
        when(jdbcTemplate.queryForObject(contains("AND username <> ?"), eq(Integer.class), eq("CM123"), eq("bob")))
                .thenReturn(1);

        assertEquals(1, repository.countOtherUsersWithNationalId("CM123", "bob"));
    }

    @Test
    void submitVerification_marksTheAccountPending() {
        repository.submitVerification("f", "b", "CM123", "w", "c", "cv", "Land", "BAR1", "{}", "Lawyer", "bob");

        verify(jdbcTemplate).update(contains("verification_status = 'PENDING'"),
                eq("f"), eq("b"), eq("CM123"), eq("w"), eq("c"), eq("cv"), eq("Land"), eq("BAR1"), eq("{}"),
                eq("Lawyer"), eq("bob"));
    }

    @Test
    void districtUpdates_bindValuesInSqlOrder() {
        repository.updateDistrictAndLocation("Kampala", 0.31, 32.58, "bob");
        repository.updateDistrict("Gulu", "bob");

        verify(jdbcTemplate).update(contains("district_assigned_at = NOW()"),
                eq("Kampala"), eq(0.31), eq(32.58), eq("bob"));
        verify(jdbcTemplate).update(eq("UPDATE users SET district = ? WHERE username = ?"), eq("Gulu"), eq("bob"));
    }
}
