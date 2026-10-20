package lcdjp.cases;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** SQL for the messages on a case. */
@Repository
public class CaseMessageRepository {

    private final JdbcTemplate jdbcTemplate;

    public CaseMessageRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insert(String caseId, String fromRole, String fromName, String fromUsername, String text,
                       String sentTo, String sentToRole, String timestamp, boolean read, boolean preAcceptance) {
        jdbcTemplate.update(
                "INSERT INTO case_messages " +
                        "(case_id, from_user, from_name, from_username, message_text, " +
                        " sent_to, sent_to_role, timestamp, is_read, pre_acceptance) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                caseId, fromRole, fromName, fromUsername, text,
                sentTo, sentToRole, timestamp,
                read,
                preAcceptance);
    }

    public List<Map<String, Object>> findByCase(String caseId) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM case_messages WHERE case_id = ? ORDER BY timestamp ASC", caseId);
    }

    /** @return rows updated; 0 means no such message on that case. */
    public int markRead(Integer messageId, String caseId) {
        return jdbcTemplate.update(
                "UPDATE case_messages SET is_read = true WHERE id = ? AND case_id = ?", messageId, caseId);
    }
}
