package lcdjp.cases;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Dashboard counts. The cached methods return plain maps of numbers on purpose: Redis stores cache
 * values as JSON, and a {@code ResponseEntity} cannot be read back from it, so the first request
 * would work and later cache hits would fail. Controllers wrap these maps in a {@code ResponseEntity}.
 *
 * <p>Cache name and keys are unchanged; the {@code @CacheEvict} methods on the controllers clear exactly the keys they change ('cases', 'admin-verification').
 * {@code sync = true} makes one thread rebuild an expired entry while the others wait, instead of every request hitting MySQL.
 */
@Service
public class StatisticsService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Cacheable(value = "statistics", key = "'cases'", sync = true)
    public Map<String, Object> caseStatistics() {
        return caseCounts();
    }

    @Cacheable(value = "statistics", key = "'admin-verification'", sync = true)
    public Map<String, Object> adminStatistics() {
        Map<String, Object> stats = new LinkedHashMap<>(caseCounts());
        stats.put("totalUsers", count("SELECT COUNT(*) FROM users WHERE LOWER(username) <> 'system_admin'"));
        stats.put("citizens", count("SELECT COUNT(*) FROM users WHERE LOWER(username) <> 'system_admin' AND LOWER(TRIM(role)) = 'citizen'"));
        stats.put("lawyers", count("SELECT COUNT(*) FROM users WHERE LOWER(username) <> 'system_admin' AND LOWER(TRIM(role)) = 'lawyer'"));
        stats.put("lcOfficials", count("SELECT COUNT(*) FROM users WHERE LOWER(username) <> 'system_admin' AND LOWER(TRIM(role)) IN ('lc official','lc1','lc2','lc3')"));
        stats.put("pendingVerifications", count("SELECT COUNT(*) FROM users WHERE verification_status = 'PENDING'"));
        stats.put("approvedVerifications", count("SELECT COUNT(*) FROM users WHERE verification_status = 'APPROVED'"));
        stats.put("rejectedVerifications", count("SELECT COUNT(*) FROM users WHERE verification_status = 'REJECTED'"));
        return stats;
    }

    /** Case counts, computed directly (calls inside this class bypass the cache proxy, which is intended). */
    private Map<String, Object> caseCounts() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCases", count("SELECT COUNT(*) FROM cases"));
        stats.put("pendingCases", count("SELECT COUNT(*) FROM cases WHERE LOWER(TRIM(status)) = 'pending'"));
        stats.put("resolvedCases", count("SELECT COUNT(*) FROM cases WHERE LOWER(TRIM(status)) = 'resolved'"));
        stats.put("withLawyers", count("SELECT COUNT(*) FROM cases WHERE LOWER(TRIM(status)) IN "
                + "('accepted by lawyer','forwarded to lawyer') OR assigned_lawyer IS NOT NULL"));
        return stats;
    }

    private int count(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }
}
