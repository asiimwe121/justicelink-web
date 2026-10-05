package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserCaseCleanupService {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(UserCaseCleanupService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public int purgeUserCaseData(String username) {
        List<String> caseRefs;
        try {
            caseRefs = jdbcTemplate.queryForList(
                    "SELECT case_reference FROM cases WHERE citizen_id = ?",
                    String.class, username);
        } catch (Exception e) {
            logger.error("⚠️ Could not look up cases for " + username + ": " + e.getMessage());
            caseRefs = new ArrayList<>();
        }

        for (String caseRef : caseRefs) {
            if (caseRef == null || caseRef.isBlank()) continue;
            safeUpdate("DELETE FROM case_messages WHERE case_id = ?", caseRef);
            safeUpdate("DELETE FROM documents WHERE case_id = ?", caseRef);
            safeUpdate("DELETE FROM notifications WHERE case_reference = ?", caseRef);
        }

        int casesRemoved = safeUpdate("DELETE FROM cases WHERE citizen_id = ?", username);

        safeUpdate("UPDATE cases SET assigned_lawyer = NULL WHERE assigned_lawyer = ?", username);
        safeUpdate("UPDATE cases SET selected_lawyer = NULL, selected_lawyer_status = NULL "
                + "WHERE selected_lawyer = ?", username);
        safeUpdate("UPDATE cases SET assigned_lc = NULL WHERE assigned_lc = ?", username);
        safeUpdate("UPDATE cases SET assigned_org = NULL WHERE assigned_org = ?", username);
        safeUpdate("UPDATE cases SET current_handler = NULL, handler_role = NULL "
                + "WHERE current_handler = ?", username);

        safeUpdate("DELETE FROM notifications WHERE username = ?", username);
        safeUpdate("DELETE FROM case_messages WHERE from_user = ? OR from_username = ?",
                username, username);
        safeUpdate("DELETE FROM documents WHERE owner = ?", username);
        safeUpdate("DELETE FROM chat_messages WHERE from_user = ? OR sent_to = ?",
                username, username);
        safeUpdate("DELETE FROM password_reset_tokens WHERE username = ?", username);

        return casesRemoved;
    }

    private int safeUpdate(String sql, Object... args) {
        try {
            return jdbcTemplate.update(sql, args);
        } catch (Exception e) {
            logger.error("⚠️ Cleanup step skipped [" + sql + "]: " + e.getMessage());
            return 0;
        }
    }
}
