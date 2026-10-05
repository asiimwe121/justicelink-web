package lcdjp;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.HashMap;

@Service
public class AuditLogService {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AuditLogService.class);
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final int SHORT_FIELD_MAX = 255;
    private static final int DETAILS_MAX = 2000;
    private static final int USER_AGENT_MAX = 1000;

    private String cap(String value, int maxLength) {
        if (value == null) return null;
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    public void logAction(String username, String userRole, String action, String entityType, String entityId, String details) {
        try {
            String sql = "INSERT INTO audit_logs (username, user_role, action, entity_type, entity_id, details, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, NOW())";
            jdbcTemplate.update(sql,
                    cap(username, SHORT_FIELD_MAX),
                    cap(userRole, SHORT_FIELD_MAX),
                    cap(action, SHORT_FIELD_MAX),
                    cap(entityType, SHORT_FIELD_MAX),
                    cap(entityId, SHORT_FIELD_MAX),
                    cap(details, DETAILS_MAX));
            logger.info("✅ Audit log entry created: " + action + " by " + username);
        } catch (Exception e) {
            logger.error("❌ Failed to create audit log: " + e.getMessage());
        }
    }

    public void logActionWithRequest(String username, String userRole, String action, String entityType, String entityId, String details, HttpServletRequest request) {
        try {
            String ipAddress = getClientIP(request);
            String userAgent = request.getHeader("User-Agent");

            String sql = "INSERT INTO audit_logs (username, user_role, action, entity_type, entity_id, details, ip_address, user_agent, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            jdbcTemplate.update(sql,
                    cap(username, SHORT_FIELD_MAX),
                    cap(userRole, SHORT_FIELD_MAX),
                    cap(action, SHORT_FIELD_MAX),
                    cap(entityType, SHORT_FIELD_MAX),
                    cap(entityId, SHORT_FIELD_MAX),
                    cap(details, DETAILS_MAX),
                    cap(ipAddress, SHORT_FIELD_MAX),
                    cap(userAgent, USER_AGENT_MAX));
            logger.info("✅ Audit log entry created with IP: " + action + " by " + username);
        } catch (Exception e) {
            logger.error("❌ Failed to create audit log: " + e.getMessage());
        }
    }

    private String getClientIP(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    public List<Map<String, Object>> getAuditLogs(String username) {
        try {
            String sql = "SELECT * FROM audit_logs WHERE username = ? ORDER BY created_at DESC LIMIT 100";
            return jdbcTemplate.queryForList(sql, username);
        } catch (Exception e) {
            logger.error("❌ Failed to get audit logs: " + e.getMessage());
            return List.of();
        }
    }

    public List<Map<String, Object>> getAuditLogsByEntity(String entityType, String entityId) {
        try {
            String sql = "SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 100";
            return jdbcTemplate.queryForList(sql, entityType, entityId);
        } catch (Exception e) {
            logger.error("❌ Failed to get audit logs: " + e.getMessage());
            return List.of();
        }
    }

    public List<Map<String, Object>> getAllAuditLogs(int limit) {
        try {
            String sql = "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?";
            return jdbcTemplate.queryForList(sql, limit);
        } catch (Exception e) {
            logger.error("❌ Failed to get all audit logs: " + e.getMessage());
            return List.of();
        }
    }

    public List<Map<String, Object>> getAuditLogsByAction(String action) {
        try {
            String sql = "SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT 100";
            return jdbcTemplate.queryForList(sql, action);
        } catch (Exception e) {
            logger.error("❌ Failed to get audit logs by action: " + e.getMessage());
            return List.of();
        }
    }

    public List<Map<String, Object>> getAuditLogsByDateRange(String startDate, String endDate) {
        try {
            String sql = "SELECT * FROM audit_logs WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 100";
            return jdbcTemplate.queryForList(sql, startDate, endDate);
        } catch (Exception e) {
            logger.error("❌ Failed to get audit logs by date range: " + e.getMessage());
            return List.of();
        }
    }
}