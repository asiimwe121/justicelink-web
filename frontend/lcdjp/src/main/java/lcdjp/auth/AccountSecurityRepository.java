package lcdjp.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** SQL for password reset / change flows that AccountSecurityController used to run itself. */
@Repository
public class AccountSecurityRepository {

    private final JdbcTemplate jdbcTemplate;

    public AccountSecurityRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ---- lookups (each returns the matching rows; empty means no such user / token) -----------------------

    /** Rows with username and email when both match one account. */
    public List<Map<String, Object>> findUsernameAndEmail(String username, String email) {
        return jdbcTemplate.queryForList("SELECT username, email FROM users WHERE username = ? AND email = ?",
                username, email);
    }

    /** Rows with the user's email. */
    public List<Map<String, Object>> findEmail(String username) {
        return jdbcTemplate.queryForList("SELECT email FROM users WHERE username = ?", username);
    }

    /** Rows with password_hash, email and phone. */
    public List<Map<String, Object>> findCredentials(String username) {
        return jdbcTemplate.queryForList("SELECT password_hash, email, phone FROM users WHERE username = ?", username);
    }

    /** Rows with email and phone. */
    public List<Map<String, Object>> findContact(String username) {
        return jdbcTemplate.queryForList("SELECT email, phone FROM users WHERE username = ?", username);
    }

    /** One row with role and district. Throws EmptyResultDataAccessException when the user does not exist. */
    public Map<String, Object> findRoleAndDistrict(String username) {
        return jdbcTemplate.queryForMap("SELECT role, district FROM users WHERE username = ?", username);
    }

    /** Rows for an unused, unexpired reset token that matches the user and code. */
    public List<Map<String, Object>> findValidResetToken(String username, String code) {
        return jdbcTemplate.queryForList(
                "SELECT username FROM password_reset_tokens " +
                        "WHERE username = ? AND token = ? AND used = false AND expiry_date > NOW()",
                username, code);
    }

    // ---- writes ----------------------------------------------------------------------------------------------

    public void invalidateOpenResetTokens(String username) {
        jdbcTemplate.update("UPDATE password_reset_tokens SET used = true WHERE username = ? AND used = false",
                username);
    }

    public void insertResetToken(String username, String code, LocalDateTime expiry) {
        jdbcTemplate.update(
                "INSERT INTO password_reset_tokens (expiry_date, token, used, username) VALUES (?, ?, false, ?)",
                expiry, code, username);
    }

    public void markResetTokenUsed(String username, String code) {
        jdbcTemplate.update("UPDATE password_reset_tokens SET used = true WHERE username = ? AND token = ?",
                username, code);
    }

    public void updatePasswordHash(String username, String passwordHash) {
        jdbcTemplate.update("UPDATE users SET password_hash = ? WHERE username = ?", passwordHash, username);
    }

    /** Sets the new hash and flags the password as changed by the user (clears the forced-change state). */
    public void updatePasswordHashAndMarkChanged(String username, String passwordHash) {
        jdbcTemplate.update("UPDATE users SET password_hash = ?, password_changed = 1 WHERE username = ?",
                passwordHash, username);
    }
}
