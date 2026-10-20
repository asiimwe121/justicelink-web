package lcdjp.user;

import lcdjp.security.RoleAuthority;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * SQL for looking up a user's role. Controllers use this instead of writing their own
 * {@code SELECT role FROM users}; pair it with {@link RoleAuthority} for the decision.
 */
@Repository
public class UserRoleRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRoleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** @return the stored role, or null when the user does not exist or has no role. */
    public String findRole(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT role FROM users WHERE username = ?", username);
        if (rows.isEmpty() || rows.get(0).get("role") == null) {
            return null;
        }
        return rows.get(0).get("role").toString();
    }

    public boolean isAdministrator(String username) {
        return RoleAuthority.isAdministratorRole(findRole(username));
    }
}
