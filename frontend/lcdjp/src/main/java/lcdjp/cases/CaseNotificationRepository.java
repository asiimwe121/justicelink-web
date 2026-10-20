package lcdjp.cases;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** SQL for the notifications sent to a citizen about their case. */
@Repository
public class CaseNotificationRepository {

    private static final String INSERT_PREFIX =
            "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) VALUES (?, ?, '";
    private static final String INSERT_SUFFIX = "', ?, false, NOW())";

    private final JdbcTemplate jdbcTemplate;

    public CaseNotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void caseCreated(String citizenId, String message, String caseReference) {
        jdbcTemplate.update(INSERT_PREFIX + "case_created" + INSERT_SUFFIX, citizenId, message, caseReference);
    }

    public void caseAccepted(String citizenId, String message, String caseReference) {
        jdbcTemplate.update(INSERT_PREFIX + "case_accepted" + INSERT_SUFFIX, citizenId, message, caseReference);
    }

    public void aiCaseDeclined(String citizenId, String message, String caseReference) {
        jdbcTemplate.update(INSERT_PREFIX + "ai_case_declined" + INSERT_SUFFIX, citizenId, message, caseReference);
    }

    public List<Map<String, Object>> findCitizenOfCase(String caseReference) {
        return jdbcTemplate.queryForList("SELECT citizen_id FROM cases WHERE case_reference = ?", caseReference);
    }
}
