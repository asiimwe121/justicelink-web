package lcdjp.user;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * SQL against the {@code users} table that controllers used to run themselves:
 * admin reset-link target lookup, LC account creation, profile read/update and display names.
 * Behaviour (SQL text, parameter order, null handling) is unchanged from the original controller code.
 */
@Repository
public class UserAccountRepository {

    /** Columns {@link #updateProfileColumns} may set; anything else is rejected. */
    private static final Set<String> PROFILE_COLUMNS = Set.of(
            "phone", "email", "district", "sub_county", "parish", "village", "avatar_data");

    private static final String SELECT_RESET_TARGET =
            "SELECT username, first_name, last_name, email, phone, role, district FROM users WHERE username = ?";

    private static final String SELECT_DISTRICT_ADMINS =
            "SELECT username, approval_status, is_active FROM users " +
                    "WHERE LOWER(TRIM(role)) IN ('district_admin', 'district admin', 'district administrator') " +
                    "AND LOWER(TRIM(district)) = LOWER(TRIM(?))";

    private static final String COUNT_BY_USERNAME = "SELECT COUNT(*) FROM users WHERE username = ?";

    private static final String INSERT_LC_ACCOUNT =
            "INSERT INTO users (username, password_hash, first_name, last_name, role, " +
                    "email, phone, district, village, parish, sub_county, lc_level, approval_status, is_active, user_type, password_changed, " +
                    "created_by, fallback_reason, created_at) " +
                    "VALUES (?, ?, ?, ?, 'LC', ?, ?, ?, ?, ?, ?, ?, 'Approved', 1, 'individual', 0, ?, ?, NOW())";

    // Same columns as INSERT_LC_ACCOUNT, but the person picked their own password, so password_changed is already 1
    // (no forced change on first login) and fallback_reason does not apply.
    private static final String INSERT_INVITED_LC_ACCOUNT =
            "INSERT INTO users (username, password_hash, first_name, last_name, role, " +
                    "email, phone, district, village, parish, sub_county, lc_level, approval_status, is_active, user_type, password_changed, " +
                    "created_by, created_at) " +
                    "VALUES (?, ?, ?, ?, 'LC', ?, ?, ?, ?, ?, ?, ?, 'Approved', 1, 'individual', 1, ?, NOW())";

    private static final String SELECT_PROFILE =
            "SELECT user_id, username, first_name, last_name, email, phone, role, " +
                    "district, sub_county, parish, village, national_id, gender, date_of_birth, " +
                    "user_type, approval_status, created_at, " +
                    "verification_status, verification_submitted_at, verification_reviewed_at, " +
                    "verification_reviewed_by, verification_rejection_reason " +
                    "FROM users WHERE username = ?";

    private static final String COUNT_BY_EMAIL = "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(?)";

    private static final String COUNT_OTHER_USERS_WITH_EMAIL =
            "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(?) AND username <> ?";

    private static final String SELECT_DISPLAY_NAME =
            "SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE username = ?";

    private static final String SELECT_ROLE = "SELECT role FROM users WHERE username = ?";

    private static final String SELECT_VERIFICATION_DISTRICT_ADMIN =
            "SELECT username FROM users WHERE role IN ('DISTRICT_ADMIN', 'District Admin') " +
                    "AND district = ? ORDER BY username LIMIT 1";

    private static final String SELECT_SYSTEM_ADMIN =
            "SELECT username FROM users WHERE role IN ('Admin', 'SYSTEM_ADMIN', " +
                    "'System Administrator') ORDER BY username LIMIT 1";

    private static final String COUNT_DISTRICT_ADMINS_IN_DISTRICT =
            "SELECT COUNT(*) FROM users WHERE LOWER(TRIM(role)) IN " +
                    "('district_admin', 'district admin', 'district administrator') " +
                    "AND LOWER(TRIM(district)) = LOWER(TRIM(?))";

    private static final String SELECT_PENDING_VERIFICATIONS =
            "SELECT username, first_name, last_name, phone, email, district, " +
                    "verification_submitted_at, verification_documents " +
                    "FROM users WHERE verification_status = 'PENDING'";

    private static final String VERIFY_UNVERIFIED_USERS =
            "UPDATE users SET verification_status = 'VERIFIED' " +
                    "WHERE verification_status IS NULL OR verification_status = 'BASIC'";

    private final JdbcTemplate jdbcTemplate;

    public UserAccountRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** @return the target user's contact/role row for an admin reset link, or null when there is no such user. */
    public Map<String, Object> findResetTarget(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(SELECT_RESET_TARGET, username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Rows (username, approval_status, is_active) for every district admin of the district. */
    public List<Map<String, Object>> findDistrictAdmins(String district) {
        return jdbcTemplate.queryForList(SELECT_DISTRICT_ADMINS, district);
    }

    public Integer countByUsername(String username) {
        return jdbcTemplate.queryForObject(COUNT_BY_USERNAME, Integer.class, username);
    }

    /**
     * Inserts an approved, active LC account of the given level (LC1..LC5).
     * village, parish, subCounty, createdBy and fallbackReason may be null (which ones apply depends on the level).
     */
    public void insertLcAccount(String username, String passwordHash, String firstName, String lastName,
                                String email, String phone, String district, String village,
                                String parish, String subCounty, String lcLevel,
                                String createdBy, String fallbackReason) {
        jdbcTemplate.update(INSERT_LC_ACCOUNT,
                username, passwordHash, firstName, lastName,
                email, phone, district, village, parish, subCounty, lcLevel,
                createdBy, fallbackReason);
    }

    /**
     * Inserts an approved, active LC account for someone who signed up through an invite link and chose
     * their own password. createdBy records which admin sent the link. Areas that do not apply may be null.
     */
    public void insertInvitedLcAccount(String username, String passwordHash, String firstName, String lastName,
                                       String email, String phone, String district, String village,
                                       String parish, String subCounty, String lcLevel, String createdBy) {
        jdbcTemplate.update(INSERT_INVITED_LC_ACCOUNT,
                username, passwordHash, firstName, lastName,
                email, phone, district, village, parish, subCounty, lcLevel, createdBy);
    }

    /** @return the profile row (mutable map), or null when there is no such user. */
    public Map<String, Object> findProfile(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(SELECT_PROFILE, username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** How many accounts use this email at all (case-insensitive). */
    public Integer countByEmail(String email) {
        return jdbcTemplate.queryForObject(COUNT_BY_EMAIL, Integer.class, email);
    }

    /** How many accounts other than {@code excludeUsername} already use this email (case-insensitive). */
    public Integer countOtherUsersWithEmail(String email, String excludeUsername) {
        return jdbcTemplate.queryForObject(COUNT_OTHER_USERS_WITH_EMAIL, Integer.class, email, excludeUsername);
    }

    /**
     * Updates the given columns for one user. Column names must be in {@link #PROFILE_COLUMNS};
     * values are always bound as parameters.
     *
     * @return rows affected
     */
    public int updateProfileColumns(String username, Map<String, Object> columnValues) {
        if (columnValues.isEmpty()) {
            throw new IllegalArgumentException("No columns to update");
        }
        StringBuilder sql = new StringBuilder("UPDATE users SET ");
        List<Object> params = new ArrayList<>();
        boolean first = true;
        for (Map.Entry<String, Object> entry : columnValues.entrySet()) {
            if (!PROFILE_COLUMNS.contains(entry.getKey())) {
                throw new IllegalArgumentException("Column cannot be updated: " + entry.getKey());
            }
            if (!first) {
                sql.append(", ");
            }
            sql.append(entry.getKey()).append(" = ?");
            params.add(entry.getValue());
            first = false;
        }
        sql.append(" WHERE username = ?");
        params.add(username);
        return jdbcTemplate.update(sql.toString(), params.toArray());
    }

    /** "First Last" for the user. Throws (EmptyResultDataAccessException) when the user does not exist. */
    public String findDisplayName(String username) {
        return jdbcTemplate.queryForObject(SELECT_DISPLAY_NAME, String.class, username);
    }

    /** The user's role. Throws (EmptyResultDataAccessException) when the user does not exist. */
    public String findRole(String username) {
        return jdbcTemplate.queryForObject(SELECT_ROLE, String.class, username);
    }

    /** First district admin (by username) for the exact district, or null when there is none. */
    public String findVerificationDistrictAdmin(String district) {
        List<String> names = jdbcTemplate.queryForList(SELECT_VERIFICATION_DISTRICT_ADMIN, String.class, district);
        return names.isEmpty() ? null : names.get(0);
    }

    /** First system administrator (by username), or null when there is none. Also used for chat routing. */
    public String findSystemAdminUsername() {
        List<String> names = jdbcTemplate.queryForList(SELECT_SYSTEM_ADMIN, String.class);
        return names.isEmpty() ? null : names.get(0);
    }

    /** Number of district admins whose district matches (case-insensitive, trimmed). */
    public int countDistrictAdminsInDistrict(String district) {
        Integer count = jdbcTemplate.queryForObject(COUNT_DISTRICT_ADMINS_IN_DISTRICT, Integer.class, district);
        return count == null ? 0 : count;
    }

    /** Pending verification requests; pass a district to scope them, or null for every district. */
    public List<Map<String, Object>> findPendingVerificationRequests(String district) {
        if (district == null) {
            return jdbcTemplate.queryForList(SELECT_PENDING_VERIFICATIONS);
        }
        return jdbcTemplate.queryForList(
                SELECT_PENDING_VERIFICATIONS + " AND LOWER(TRIM(district)) = LOWER(TRIM(?))", district);
    }

    /** One-off migration: users with no or BASIC status become VERIFIED. Returns the rows changed. */
    public int markUnverifiedUsersVerified() {
        return jdbcTemplate.update(VERIFY_UNVERIFIED_USERS);
    }
}
