package lcdjp.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** SQL on the users table for the admin user-management endpoints that AdminUserController ran itself. */
@Repository
public class AdminUserRepository {

    /** Columns an admin may change through {@link #updateUser}. Anything else is rejected, never concatenated. */
    static final Set<String> UPDATABLE_COLUMNS = Set.of(
            "first_name", "last_name", "phone", "email", "district", "sub_county", "parish", "village",
            "national_id", "gender", "date_of_birth", "approval_status", "is_active", "user_type",
            "lawyer_specialization", "law_firm_name", "law_school", "years_experience", "bar_number",
            "lc_level", "lc_position", "organization_name", "organization_type", "specialization",
            "next_of_kin_name", "next_of_kin_phone", "next_of_kin_email", "next_of_kin_relationship",
            "avatar_data");

    private static final String LIST_COLUMNS =
            "user_id, first_name, last_name, username, email, phone, role, district, " +
                    "lawyer_specialization, approval_status, verification_status, created_at, user_type, requested_role";

    private static final String PENDING_VERIFICATION_SUMMARY =
            "SELECT username, first_name, last_name, email, phone, district, " +
                    "verification_submitted_at, verification_status, requested_role " +
                    "FROM users WHERE verification_status = 'PENDING'";

    private static final String PENDING_APPROVALS =
            "SELECT " + LIST_COLUMNS + " FROM users WHERE verification_status = 'PENDING'";

    private static final String DISTRICT_MATCH = " AND LOWER(TRIM(district)) = LOWER(TRIM(?))";

    private final JdbcTemplate jdbcTemplate;

    public AdminUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ---- lookups ---------------------------------------------------------------------------------------------

    /** Lower-cased districts that have at least one district admin. */
    public List<String> findDistrictsWithAdmin() {
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT LOWER(TRIM(district)) FROM users " +
                        "WHERE LOWER(TRIM(role)) IN ('district_admin', 'district admin', 'district administrator') " +
                        "AND district IS NOT NULL AND TRIM(district) <> ''",
                String.class);
    }

    /** The user's district, or null when the user does not exist or has none. */
    public String findDistrict(String username) {
        List<String> districts = jdbcTemplate.queryForList(
                "SELECT district FROM users WHERE username = ?", String.class, username);
        return districts.isEmpty() ? null : districts.get(0);
    }

    /** district, role and verification_submitted_at, or null when there is no such user. */
    public Map<String, Object> findDistrictRoleAndSubmittedAt(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT district, role, verification_submitted_at FROM users WHERE username = ?", username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public boolean userExists(String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
        return count != null && count > 0;
    }

    /** True when another account (not {@code username}) already uses the email, case-insensitively. */
    public boolean emailUsedByAnotherUser(String email, String username) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(?) AND username <> ?",
                Integer.class, email, username);
        return count != null && count > 0;
    }

    /** Every column of the user row; empty when there is no such user. */
    public List<Map<String, Object>> findAllColumns(String username) {
        return jdbcTemplate.queryForList("SELECT * FROM users WHERE username = ?", username);
    }

    public List<Map<String, Object>> findVerificationDocuments(String username) {
        return jdbcTemplate.queryForList(
                "SELECT id_front, id_back, lawyer_work_id, lawyer_certificate, " +
                        "lawyer_cv_data, lawyer_cv_name, lawyer_cv_size, lawyer_cv_type, " +
                        "lc_appointment_letter, lc_official_id, verification_documents, documents " +
                        "FROM users WHERE username = ?",
                username);
    }

    public List<Map<String, Object>> findVerificationStatus(String username) {
        return jdbcTemplate.queryForList(
                "SELECT verification_status, verification_submitted_at, " +
                        "verification_reviewed_at, verification_reviewed_by, " +
                        "verification_rejection_reason FROM users WHERE username = ?",
                username);
    }

    public List<Map<String, Object>> findEmailAndFirstName(String username) {
        return jdbcTemplate.queryForList("SELECT email, first_name FROM users WHERE username = ?", username);
    }

    // ---- listings --------------------------------------------------------------------------------------------

    public List<Map<String, Object>> listAllUsers() {
        return jdbcTemplate.queryForList(
                "SELECT " + LIST_COLUMNS + " FROM users WHERE username != 'system_admin'");
    }

    public List<Map<String, Object>> listAllUsersPage(int pageSize, int offset) {
        return jdbcTemplate.queryForList(
                "SELECT " + LIST_COLUMNS + " FROM users WHERE username != 'system_admin' LIMIT ? OFFSET ?",
                pageSize, offset);
    }

    public Long countAllUsers() {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username != 'system_admin'", Long.class);
    }

    public List<Map<String, Object>> listUsersInDistrict(String district) {
        return jdbcTemplate.queryForList(
                "SELECT " + LIST_COLUMNS + " FROM users WHERE district = ? AND username != 'system_admin'", district);
    }

    public List<Map<String, Object>> listUsersInDistrictPage(String district, int pageSize, int offset) {
        return jdbcTemplate.queryForList(
                "SELECT " + LIST_COLUMNS + " FROM users WHERE district = ? AND username != 'system_admin' " +
                        "LIMIT ? OFFSET ?",
                district, pageSize, offset);
    }

    public Long countUsersInDistrict(String district) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE district = ? AND username != 'system_admin'", Long.class, district);
    }

    /** Pending verification requests (summary columns); pass a district to scope them, or null for all. */
    public List<Map<String, Object>> findPendingVerificationSummaries(String district) {
        return district == null
                ? jdbcTemplate.queryForList(PENDING_VERIFICATION_SUMMARY)
                : jdbcTemplate.queryForList(PENDING_VERIFICATION_SUMMARY + DISTRICT_MATCH, district);
    }

    /** Pending verification requests (full list columns); pass a district to scope them, or null for all. */
    public List<Map<String, Object>> findPendingApprovals(String district) {
        return district == null
                ? jdbcTemplate.queryForList(PENDING_APPROVALS)
                : jdbcTemplate.queryForList(PENDING_APPROVALS + DISTRICT_MATCH, district);
    }

    // ---- writes ----------------------------------------------------------------------------------------------

    public int approve(String username) {
        return jdbcTemplate.update("UPDATE users SET approval_status = 'Approved' WHERE username = ?", username);
    }

    public int reject(String username) {
        return jdbcTemplate.update("UPDATE users SET approval_status = 'Rejected' WHERE username = ?", username);
    }

    /**
     * Sets the given columns (in the map's iteration order) for one user and returns the rows changed.
     * Only {@link #UPDATABLE_COLUMNS} are accepted. {@code is_active} also maintains deactivated_at: setting it to
     * false keeps an existing deactivation time (or stamps now), setting it to true clears it.
     */
    public int updateUser(String username, Map<String, Object> columns) {
        if (columns.isEmpty()) {
            throw new IllegalArgumentException("No fields to update");
        }
        StringBuilder sql = new StringBuilder("UPDATE users SET ");
        List<Object> params = new ArrayList<>();
        for (Map.Entry<String, Object> column : columns.entrySet()) {
            String name = column.getKey();
            if (!UPDATABLE_COLUMNS.contains(name)) {
                throw new IllegalArgumentException("Column cannot be updated: " + name);
            }
            if ("is_active".equals(name)) {
                boolean active = Boolean.TRUE.equals(column.getValue());
                sql.append(active
                        ? "is_active = ?, deactivated_at = NULL, "
                        : "is_active = ?, deactivated_at = COALESCE(deactivated_at, CURRENT_TIMESTAMP), ");
            } else {
                sql.append(name).append(" = ?, ");
            }
            params.add(column.getValue());
        }
        sql.setLength(sql.length() - 2);
        sql.append(" WHERE username = ?");
        params.add(username);
        return jdbcTemplate.update(sql.toString(), params.toArray());
    }
}
