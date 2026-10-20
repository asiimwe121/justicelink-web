package lcdjp.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Read-only aggregate queries behind {@link DistrictMetricsController}.
 * Aggregates only, no case content.
 */
@Repository
public class DistrictMetricsRepository {

    private static final String SELECT_METRICS = "SELECT district, "
            + "COUNT(*) AS total, "
            + "SUM(CASE WHEN COALESCE(status,'Pending') NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS open_cases, "
            + "SUM(CASE WHEN status IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS resolved_cases, "
            + "SUM(CASE WHEN escalation_level > 0 AND COALESCE(status,'Pending') NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS escalated_open, "
            + "AVG(CASE WHEN accepted_date IS NOT NULL AND created_at IS NOT NULL "
            + "    THEN TIMESTAMPDIFF(MINUTE, created_at, accepted_date) END) AS avg_first_response_min, "
            + "AVG(CASE WHEN resolved_at IS NOT NULL AND created_at IS NOT NULL "
            + "    THEN TIMESTAMPDIFF(MINUTE, created_at, resolved_at) END) AS avg_resolution_min "
            + "FROM cases WHERE district IS NOT NULL ";

    private static final String DISTRICT_FILTER = "AND LOWER(district) = LOWER(?) ";
    private static final String GROUP_AND_ORDER = "GROUP BY district ORDER BY district";

    private final JdbcTemplate jdbcTemplate;

    public DistrictMetricsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Metrics for every district. */
    public List<Map<String, Object>> findAllDistricts() {
        return jdbcTemplate.queryForList(SELECT_METRICS + GROUP_AND_ORDER);
    }

    /** Metrics for one district (case-insensitive match). */
    public List<Map<String, Object>> findByDistrict(String district) {
        return jdbcTemplate.queryForList(SELECT_METRICS + DISTRICT_FILTER + GROUP_AND_ORDER, district);
    }
}
