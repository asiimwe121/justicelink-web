package lcdjp.cases;

import lcdjp.security.RequestIdentity;
import lcdjp.security.RoleAuthority;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CaseAccessService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CaseAccessService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RequestIdentity requestIdentity;

    public String authenticatedUsername() {
        return requestIdentity.resolveUsername();
    }

    public String authenticatedRole() {
        String username = authenticatedUsername();
        return username == null ? null : strVal(userRow(username).get("role"));
    }

    public boolean isAdministrator(String username) {
        return RoleAuthority.isAdministratorRole(strVal(userRow(username).get("role")));
    }

    public boolean canAccessCase(String username, Map<String, Object> caseRow) {
        if (isAdministrator(username)) return true;
        return username.equals(strVal(caseRow.get("citizen_id")))
                || username.equals(strVal(caseRow.get("current_handler")))
                || username.equals(strVal(caseRow.get("assigned_lc")))
                || username.equals(strVal(caseRow.get("assigned_lawyer")))
                || username.equals(strVal(caseRow.get("selected_lawyer")))
                || username.equals(strVal(caseRow.get("assigned_org")))
                || isPreviousHandler(username, strVal(caseRow.get("case_reference")));
    }

    public boolean isPreviousHandler(String username, String caseId) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM audit_logs WHERE entity_type = 'case' " +
                            "AND entity_id = ? AND action = 'CASE_FORWARDED' " +
                            "AND username = ?", Integer.class, caseId, username);
            return count != null && count > 0;
        } catch (Exception e) {
            // Fails closed (no access), but say so: a database outage must not look like "nobody is a previous handler".
            log.warn("previous-handler check failed for case {}: {}", caseId, e.toString());
            return false;
        }
    }

    public List<Map<String, Object>> previousHandlers(String caseId) {
        try {
            return jdbcTemplate.queryForList(
                    "SELECT username, user_role, created_at FROM audit_logs " +
                            "WHERE entity_type = 'case' AND entity_id = ? " +
                            "AND action = 'CASE_FORWARDED' ORDER BY created_at ASC",
                    caseId
            );
        } catch (Exception e) {
            log.warn("could not load previous handlers for case {}: {}", caseId, e.toString());
            return List.of();
        }
    }

    public boolean isAssignedLcForCase(String actor, Map<String, Object> caseRow) {
        Map<String, Object> actorRow = userRow(actor);
        String role = strVal(actorRow.get("role")).toUpperCase().replace(' ', '_');
        boolean isLcRole = role.equals("LC") || role.startsWith("LC1") || role.startsWith("LC2") || role.startsWith("LC3");
        if (!isLcRole) return false;

        String assignedLc = strVal(caseRow.get("assigned_lc"));
        String currentHandler = strVal(caseRow.get("current_handler"));
        if (actor.equals(assignedLc) || actor.equals(currentHandler)) return true;

        if (assignedLc.isEmpty() && currentHandler.isEmpty()) {
            String track = strVal(caseRow.get("jurisdiction_track"));
            if (!track.isEmpty() && !track.equals("LC_MEDIATION") && !track.equals("LAND")) {
                return false;
            }
            String actorDistrict = strVal(actorRow.get("district"));
            String caseDistrict = strVal(caseRow.get("district"));
            return !actorDistrict.isEmpty() && actorDistrict.equalsIgnoreCase(caseDistrict);
        }
        return false;
    }

    public ResponseEntity<?> requireCaseActor(String caseId, String username) {
        Map<String, Object> row = singleCase(caseId);
        if (row == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Case not found"));
        }
        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        if (!canAccessCase(username, row)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You do not have access to this case"));
        }
        return null;
    }

    public Map<String, Object> singleCase(String caseId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT * FROM cases WHERE case_reference = ?", caseId);
        return rows.isEmpty() ? null : CaseRows.open(rows.get(0));
    }

    public Map<String, Object> userRow(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, first_name, last_name, role, district FROM users WHERE username = ?",
                username);
        return rows.isEmpty() ? Map.of("username", username) : rows.get(0);
    }

    private String strVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
