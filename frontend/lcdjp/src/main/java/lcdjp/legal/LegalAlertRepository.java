package lcdjp.legal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** SQL for the legal_alerts table that LegalAlertsController used to run itself. */
@Repository
public class LegalAlertRepository {

    private static final String SELECT_ACTIVE =
            "SELECT id, title, content, category, priority, audience, created_by, created_at, is_active " +
                    "FROM legal_alerts WHERE is_active = TRUE ";

    private static final String INSERT =
            "INSERT INTO legal_alerts (title, content, category, priority, audience, created_by, is_active) " +
                    "VALUES (?, ?, ?, ?, ?, ?, 1)";

    private final JdbcTemplate jdbcTemplate;

    public LegalAlertRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Newest 100 active alerts, optionally limited to one category (null or empty means all). */
    public List<Map<String, Object>> findActive(String category) {
        if (category != null && !category.isEmpty()) {
            return jdbcTemplate.queryForList(SELECT_ACTIVE + "AND category = ? ORDER BY created_at DESC LIMIT 100",
                    category);
        }
        return jdbcTemplate.queryForList(SELECT_ACTIVE + "ORDER BY created_at DESC LIMIT 100");
    }

    public List<Map<String, Object>> findActiveById(Long id) {
        return jdbcTemplate.queryForList(
                "SELECT id, title, content, category, created_by, created_at, is_active " +
                        "FROM legal_alerts WHERE id = ? AND is_active = TRUE", id);
    }

    /**
     * Inserts an active alert and returns its id. The id comes from the same statement (generated keys), not from
     * a second "SELECT LAST_INSERT_ID()" call, which can run on a different pooled connection and return another id.
     */
    public Long insert(String title, String content, String category, String priority, String audience,
                       String createdBy) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(INSERT, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, title);
            ps.setString(2, content);
            ps.setString(3, category);
            ps.setString(4, priority);
            ps.setString(5, audience);
            ps.setString(6, createdBy);
            return ps;
        }, keys);
        Number key = keys.getKey();
        return key == null ? null : key.longValue();
    }

    /** Soft delete. Returns the number of rows changed (0 when the id is unknown). */
    public int deactivate(Long id) {
        return jdbcTemplate.update("UPDATE legal_alerts SET is_active = FALSE WHERE id = ?", id);
    }

    /**
     * Updates only the fields that are not null. At least one must be set. Returns the rows changed.
     */
    public int update(Long id, String title, String content, String category, Boolean isActive) {
        List<String> updates = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        if (title != null) {
            updates.add("title = ?");
            params.add(title);
        }
        if (content != null) {
            updates.add("content = ?");
            params.add(content);
        }
        if (category != null) {
            updates.add("category = ?");
            params.add(category);
        }
        if (isActive != null) {
            updates.add("is_active = ?");
            params.add(isActive ? 1 : 0);
        }
        if (updates.isEmpty()) {
            throw new IllegalArgumentException("No fields to update");
        }
        params.add(id);
        return jdbcTemplate.update("UPDATE legal_alerts SET " + String.join(", ", updates) + " WHERE id = ?",
                params.toArray());
    }
}
