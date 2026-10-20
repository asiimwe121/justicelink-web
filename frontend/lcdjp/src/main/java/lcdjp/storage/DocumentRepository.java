package lcdjp.storage;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

/** SQL for the documents table (plus the small user / case / audit lookups) that DocumentController ran itself. */
@Repository
public class DocumentRepository {

    private static final String INSERT =
            "INSERT INTO documents " +
                    "(file_name, file_type, file_size, file_data, owner, case_id, category, description, " +
                    "shared_with, is_archived, upload_date) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', FALSE, NOW())";

    private final JdbcTemplate jdbcTemplate;

    public DocumentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Inserts a document and returns its generated id (0 when the driver returns none). */
    public long insert(String fileName, String fileType, long fileSize, String storedData, String owner,
                       String caseId, String category, String description) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(INSERT, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, fileName);
            ps.setString(2, fileType);
            ps.setLong(3, fileSize);
            ps.setString(4, storedData);
            ps.setString(5, owner);
            ps.setString(6, caseId);
            ps.setString(7, category);
            ps.setString(8, description);
            return ps;
        }, keyHolder);
        Number generatedId = keyHolder.getKey();
        return generatedId != null ? generatedId.longValue() : 0L;
    }

    /** The document row, or null when there is none. The id may be a String (from a path) or a Long. */
    public Map<String, Object> findById(Object docId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM documents WHERE id = ?", docId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Documents the user owns or that are shared with them, newest first. */
    public List<Map<String, Object>> findVisibleToUser(String username, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM documents " +
                        "WHERE owner = ? OR FIND_IN_SET(?, REPLACE(shared_with, ' ', '')) > 0 " +
                        "ORDER BY upload_date DESC LIMIT ?",
                username, username, limit);
    }

    public List<Map<String, Object>> findByCase(String caseId, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM documents WHERE case_id = ? ORDER BY upload_date DESC LIMIT ?", caseId, limit);
    }

    /** The newest 200 audit entries about documents of this case. */
    public List<Map<String, Object>> findAuditLogs(String caseId) {
        return jdbcTemplate.queryForList(
                "SELECT * FROM audit_logs WHERE entity_type = 'document' AND entity_id = ? " +
                        "ORDER BY created_at DESC LIMIT 200",
                caseId);
    }

    /** Returns the rows deleted (0 when the id is unknown). */
    public int delete(String docId) {
        return jdbcTemplate.update("DELETE FROM documents WHERE id = ?", docId);
    }

    public void updateSharedWith(String docId, String sharedWith) {
        jdbcTemplate.update("UPDATE documents SET shared_with = ? WHERE id = ?", sharedWith, docId);
    }

    /** username and role of the user, or null when there is no such user. */
    public Map<String, Object> findUserRoleRow(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, role FROM users WHERE username = ?", username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** The case row for a case reference, or null when there is none. */
    public Map<String, Object> findCaseByReference(String caseId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT * FROM cases WHERE case_reference = ?", caseId);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
