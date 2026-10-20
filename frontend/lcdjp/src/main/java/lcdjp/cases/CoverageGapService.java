package lcdjp.cases;

import lcdjp.security.RoleAuthority;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Tells administrators when a report could not be matched to a registered office (for example no LC2 is
 * registered for the citizen's parish), so they can register or suggest one. The district admin of the case's
 * district and all system admins are notified, once per case. Messages carry the case reference, the level and
 * the area names only, never the report's content.
 */
@Service
public class CoverageGapService {

    private static final Logger logger = LoggerFactory.getLogger(CoverageGapService.class);
    static final String TYPE = "coverage_gap";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    static String message(String caseReference, String levelCode, String area, String district) {
        return "Case " + caseReference + " has no registered " + levelCode + " office"
                + (area == null || area.isBlank() ? "" : " for " + area)
                + (district == null || district.isBlank() ? "" : " (" + district + ")")
                + ". Please register an LC for this area or suggest an LC, lawyer, police station or court for the case.";
    }

    /** @return how many administrators were notified (0 if this case was already reported). */
    public int report(String caseReference, String district, String levelCode, String area) {
        try {
            Integer existing = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM notifications WHERE case_reference = ? AND type = ?",
                    Integer.class, caseReference, TYPE);
            if (existing != null && existing > 0) return 0;

            String message = message(caseReference, levelCode, area, district);
            List<Map<String, Object>> admins = jdbcTemplate.queryForList(
                    "SELECT username, role, district FROM users WHERE is_active = TRUE");
            int notified = 0;
            for (Map<String, Object> admin : admins) {
                Object username = admin.get("username");
                String role = admin.get("role") == null ? null : admin.get("role").toString();
                if (username == null) continue;
                boolean districtMatch = RoleAuthority.isDistrictAdminRole(role) && district != null
                        && admin.get("district") != null && district.equalsIgnoreCase(admin.get("district").toString());
                if (districtMatch || RoleAuthority.isSystemAdminRole(role)) {
                    jdbcTemplate.update(
                            "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) "
                                    + "VALUES (?, ?, ?, ?, FALSE, NOW())",
                            username, message, TYPE, caseReference);
                    notified++;
                }
            }
            return notified;
        } catch (Exception e) {
            logger.error("Could not report coverage gap for case {}: {}", caseReference, e.getMessage());
            return 0;
        }
    }
}
