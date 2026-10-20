package lcdjp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountSecurityRepositoryTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AccountSecurityRepository repository = new AccountSecurityRepository(jdbcTemplate);

    @Test
    void findValidResetToken_requiresUnusedUnexpiredTokenForTheUser() {
        List<Map<String, Object>> rows = List.of(Map.of("username", "jdoe"));
        when(jdbcTemplate.queryForList(
                eq("SELECT username FROM password_reset_tokens " +
                        "WHERE username = ? AND token = ? AND used = false AND expiry_date > NOW()"),
                eq("jdoe"), eq("123456"))).thenReturn(rows);

        assertEquals(rows, repository.findValidResetToken("jdoe", "123456"));
    }

    @Test
    void insertResetToken_bindsExpiryTokenAndUsernameInColumnOrder() {
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        repository.insertResetToken("jdoe", "123456", expiry);

        verify(jdbcTemplate).update(contains("INSERT INTO password_reset_tokens (expiry_date, token, used, username)"),
                eq(expiry), eq("123456"), eq("jdoe"));
    }

    @Test
    void passwordUpdates_bindHashBeforeUsername() {
        repository.updatePasswordHash("jdoe", "h1");
        repository.updatePasswordHashAndMarkChanged("jdoe", "h2");

        verify(jdbcTemplate).update(eq("UPDATE users SET password_hash = ? WHERE username = ?"), eq("h1"), eq("jdoe"));
        verify(jdbcTemplate).update(eq("UPDATE users SET password_hash = ?, password_changed = 1 WHERE username = ?"),
                eq("h2"), eq("jdoe"));
    }

    @Test
    void invalidateOpenResetTokens_onlyTouchesUnusedTokens() {
        repository.invalidateOpenResetTokens("jdoe");

        verify(jdbcTemplate).update(
                eq("UPDATE password_reset_tokens SET used = true WHERE username = ? AND used = false"), eq("jdoe"));
    }

    @Test
    void lookups_selectOnlyTheColumnsTheFlowNeeds() {
        repository.findUsernameAndEmail("jdoe", "j@x.org");
        repository.findEmail("jdoe");
        repository.findCredentials("jdoe");
        repository.findContact("jdoe");
        repository.findRoleAndDistrict("jdoe");

        verify(jdbcTemplate).queryForList(eq("SELECT username, email FROM users WHERE username = ? AND email = ?"),
                eq("jdoe"), eq("j@x.org"));
        verify(jdbcTemplate).queryForList(eq("SELECT email FROM users WHERE username = ?"), eq("jdoe"));
        verify(jdbcTemplate).queryForList(eq("SELECT password_hash, email, phone FROM users WHERE username = ?"), eq("jdoe"));
        verify(jdbcTemplate).queryForList(eq("SELECT email, phone FROM users WHERE username = ?"), eq("jdoe"));
        verify(jdbcTemplate).queryForMap(eq("SELECT role, district FROM users WHERE username = ?"), eq("jdoe"));
    }
}
