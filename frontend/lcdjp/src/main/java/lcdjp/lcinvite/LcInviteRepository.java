package lcdjp.lcinvite;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** SQL for the lc_invite_requests table (see V12__lc_invite_requests.sql). */
@Repository
public class LcInviteRepository {

    static final String PENDING = "PENDING";
    static final String SENT = "SENT";
    static final String USED = "USED";
    static final String DECLINED = "DECLINED";

    private static final int LIST_LIMIT = 200;

    private static final String INSERT_REQUEST =
            "INSERT INTO lc_invite_requests (email, district, status, requested_at) VALUES (?, ?, 'PENDING', ?)";

    private static final String COUNT_OPEN_FOR_EMAIL =
            "SELECT COUNT(*) FROM lc_invite_requests WHERE LOWER(email) = LOWER(?) " +
                    "AND LOWER(TRIM(district)) = LOWER(TRIM(?)) AND status IN ('PENDING', 'SENT')";

    private static final String SELECT_OPEN =
            "SELECT id, email, district, status, requested_at, decided_by, decided_at, expires_at " +
                    "FROM lc_invite_requests WHERE status IN ('PENDING', 'SENT') " +
                    "ORDER BY requested_at DESC LIMIT " + LIST_LIMIT;

    private static final String SELECT_BY_ID =
            "SELECT id, email, district, status, requested_at, decided_by, decided_at, expires_at " +
                    "FROM lc_invite_requests WHERE id = ?";

    private static final String MARK_SENT =
            "UPDATE lc_invite_requests SET status = 'SENT', decided_by = ?, decided_at = ?, " +
                    "token_hash = ?, expires_at = ? WHERE id = ? AND status IN ('PENDING', 'SENT')";

    private static final String MARK_DECLINED =
            "UPDATE lc_invite_requests SET status = 'DECLINED', decided_by = ?, decided_at = ?, " +
                    "token_hash = NULL WHERE id = ? AND status IN ('PENDING', 'SENT')";

    private static final String SELECT_BY_VALID_TOKEN =
            "SELECT id, email, district, decided_by FROM lc_invite_requests " +
                    "WHERE token_hash = ? AND status = 'SENT' AND expires_at > ?";

    private static final String CLAIM_TOKEN =
            "UPDATE lc_invite_requests SET status = 'USED', used_at = ? " +
                    "WHERE token_hash = ? AND status = 'SENT' AND expires_at > ?";

    private final JdbcTemplate jdbcTemplate;

    public LcInviteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insertRequest(String email, String district, LocalDateTime now) {
        jdbcTemplate.update(INSERT_REQUEST, email, district, now);
    }

    /** True when this email already has a request for this district that is waiting or has a live link. */
    public boolean hasOpenRequest(String email, String district) {
        Integer count = jdbcTemplate.queryForObject(COUNT_OPEN_FOR_EMAIL, Integer.class, email, district);
        return count != null && count > 0;
    }

    /** Newest first, capped. Filtering by who may see which district happens in the service. */
    public List<Map<String, Object>> findOpenRequests() {
        return jdbcTemplate.queryForList(SELECT_OPEN);
    }

    /** @return the request row, or null when there is no such id. */
    public Map<String, Object> findById(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(SELECT_BY_ID, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** @return true when the request was still open and now carries the new link. */
    public boolean markSent(long id, String adminUsername, String tokenHash,
                            LocalDateTime now, LocalDateTime expiresAt) {
        return jdbcTemplate.update(MARK_SENT, adminUsername, now, tokenHash, expiresAt, id) == 1;
    }

    /** @return true when the request was still open and is now declined (its link, if any, stops working). */
    public boolean markDeclined(long id, String adminUsername, LocalDateTime now) {
        return jdbcTemplate.update(MARK_DECLINED, adminUsername, now, id) == 1;
    }

    /** @return the (id, email, district, decided_by) the link is for, or null when it is unknown, used, replaced or expired. */
    public Map<String, Object> findByValidToken(String tokenHash, LocalDateTime now) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(SELECT_BY_VALID_TOKEN, tokenHash, now);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Marks the link used. Only one caller can win, so a link can never create two accounts. */
    public boolean claimToken(String tokenHash, LocalDateTime now) {
        return jdbcTemplate.update(CLAIM_TOKEN, now, tokenHash, now) == 1;
    }
}
