package lcdjp.maps;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * SQL behind the public map endpoints: approved LC officials, approved lawyers and legal-aid organisations.
 * Filters are optional; a blank value is ignored and any other value is matched case-insensitively and trimmed.
 * Column names are fixed here, so only values ever reach the query as bind parameters.
 */
@Repository
public class MapLocationRepository {

    private final JdbcTemplate jdbcTemplate;

    public MapLocationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findApprovedLcOfficials(String district, String subCounty,
                                                             String parish, String village) {
        StringBuilder sql = new StringBuilder(
                "SELECT username, first_name, last_name, district, sub_county, parish, " +
                        "village, lc_level, phone, latitude, longitude " +
                        "FROM users " +
                        "WHERE role = 'LC Official' AND approval_status = 'Approved'");
        List<Object> params = new ArrayList<>();
        appendFilter(sql, params, "district", district);
        appendFilter(sql, params, "sub_county", subCounty);
        appendFilter(sql, params, "parish", parish);
        appendFilter(sql, params, "village", village);
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public List<Map<String, Object>> findApprovedLawyers(String district, String specialization) {
        StringBuilder sql = new StringBuilder(
                "SELECT username, first_name, last_name, district, sub_county, parish, " +
                        "village, lawyer_specialization, phone, email, latitude, longitude, " +
                        "(SELECT COUNT(*) FROM cases c2 WHERE c2.assigned_lawyer = users.username AND c2.status NOT IN ('Resolved','Closed')) AS active_count " +
                        "FROM users " +
                        "WHERE role = 'Lawyer' AND approval_status = 'Approved'");
        List<Object> params = new ArrayList<>();
        appendFilter(sql, params, "district", district);
        appendFilter(sql, params, "lawyer_specialization", specialization);
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /** False when the legal_aid_organizations table is not there yet (older databases). */
    public boolean legalAidTableExists() {
        try {
            jdbcTemplate.queryForObject("SELECT 1 FROM legal_aid_organizations LIMIT 1", Integer.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public List<Map<String, Object>> findLegalAidOrganizations(String district) {
        StringBuilder sql = new StringBuilder(
                "SELECT id, org_name, district, sub_county, parish, phone, email, " +
                        "specialization, description, latitude, longitude " +
                        "FROM legal_aid_organizations WHERE 1=1");
        List<Object> params = new ArrayList<>();
        appendFilter(sql, params, "district", district);
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    private static void appendFilter(StringBuilder sql, List<Object> params, String column, String value) {
        if (value != null && !value.trim().isEmpty()) {
            sql.append(" AND LOWER(TRIM(").append(column).append(")) = LOWER(TRIM(?))");
            params.add(value);
        }
    }
}
