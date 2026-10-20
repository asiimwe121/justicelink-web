package lcdjp.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** SQL for login, OTP, password migration, audit-log viewing and the health probe used by AuthController. */
@Repository
public class AuthRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** All columns of the user row; empty when there is no such user. */
    public List<Map<String, Object>> findUserByUsername(String username) {
        return jdbcTemplate.queryForList("SELECT * FROM users WHERE username = ?", username);
    }

    /** Rows with email, phone and role. */
    public List<Map<String, Object>> findContactAndRole(String username) {
        return jdbcTemplate.queryForList("SELECT email, phone, role FROM users WHERE username = ?", username);
    }

    /** Rows with only password_hash (used to check that the account exists). */
    public List<Map<String, Object>> findPasswordHash(String username) {
        return jdbcTemplate.queryForList("SELECT password_hash FROM users WHERE username = ?", username);
    }

    /** The user's role, or null when there is no such user. */
    public String findRole(String username) {
        List<String> roles = jdbcTemplate.queryForList("SELECT role FROM users WHERE username = ?",
                String.class, username);
        return roles.isEmpty() ? null : roles.get(0);
    }

    /** The newest 100 audit entries, optionally filtered by username and/or action (blank means no filter). */
    public List<Map<String, Object>> findAuditLogs(String username, String action) {
        StringBuilder sql = new StringBuilder("SELECT * FROM audit_logs WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (username != null && !username.isEmpty()) {
            sql.append(" AND username = ?");
            params.add(username);
        }
        if (action != null && !action.isEmpty()) {
            sql.append(" AND action = ?");
            params.add(action);
        }
        sql.append(" ORDER BY created_at DESC LIMIT 100");
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /** Throws when the database cannot answer a trivial query. */
    public void pingDatabase() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    }
}
