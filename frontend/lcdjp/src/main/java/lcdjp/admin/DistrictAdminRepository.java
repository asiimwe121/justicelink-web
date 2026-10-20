package lcdjp.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** SQL for district-admin accounts that DistrictAdminController used to run itself. */
@Repository
public class DistrictAdminRepository {

    private static final String SELECT_COLUMNS =
            "SELECT user_id, username, first_name, last_name, email, phone, role, district, " +
                    "approval_status, is_active, created_at FROM users WHERE role = 'DISTRICT_ADMIN'";

    private final JdbcTemplate jdbcTemplate;

    public DistrictAdminRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean usernameExists(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
        return count != null && count > 0;
    }

    public void insertDistrictAdmin(String username, String passwordHash, String firstName, String lastName,
                                    String email, String phone, String district) {
        jdbcTemplate.update(
                "INSERT INTO users (username, password_hash, first_name, last_name, role, " +
                        "email, phone, district, approval_status, is_active, user_type, password_changed, created_at) " +
                        "VALUES (?, ?, ?, ?, 'DISTRICT_ADMIN', ?, ?, ?, 'Approved', 1, 'individual', 0, NOW())",
                username, passwordHash, firstName, lastName, email, phone, district);
    }

    public List<Map<String, Object>> findAll() {
        return jdbcTemplate.queryForList(SELECT_COLUMNS);
    }

    public List<Map<String, Object>> findByDistrict(String district) {
        return jdbcTemplate.queryForList(SELECT_COLUMNS + " AND district = ?", district);
    }

    public int count() {
        Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE role = 'DISTRICT_ADMIN'", Integer.class);
        return total == null ? 0 : total;
    }

    public List<Map<String, Object>> countByDistrict() {
        return jdbcTemplate.queryForList(
                "SELECT district, COUNT(*) as count FROM users WHERE role = 'DISTRICT_ADMIN' " +
                        "GROUP BY district ORDER BY district");
    }
}
