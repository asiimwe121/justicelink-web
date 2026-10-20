package lcdjp.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.HashMap;

@Service
public class AuditLogService {

    @Value("${app.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    @Value("${app.trusted-proxy-hops:0}")
    private int trustedProxyHops;



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
        return lcdjp.common.ClientIp.resolve(request, trustProxyHeaders, trustedProxyHops);
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

    public static final String ACTION_ADMIN_CASE_VIEW = "ADMIN_CASE_VIEW";

    /**
     * Records that an administrator read case data. Unlike logAction, a failed write is NOT
     * swallowed: it throws, so the caller refuses the read rather than leaving an unlogged access.
     */
    public void logAdminCaseView(String username, String userRole, String caseId, String scope) {
        String ip = null;
        String userAgent = null;
        org.springframework.web.context.request.RequestAttributes attrs =
                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (attrs instanceof org.springframework.web.context.request.ServletRequestAttributes sra) {
            HttpServletRequest request = sra.getRequest();
            ip = getClientIP(request);
            userAgent = request.getHeader("User-Agent");
        }
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (username, user_role, action, entity_type, entity_id, details, ip_address, user_agent, created_at) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    cap(username, SHORT_FIELD_MAX),
                    cap(userRole, SHORT_FIELD_MAX),
                    ACTION_ADMIN_CASE_VIEW,
                    "case",
                    cap(caseId, SHORT_FIELD_MAX),
                    cap("scope=" + scope, DETAILS_MAX),
                    cap(ip, SHORT_FIELD_MAX),
                    cap(userAgent, USER_AGENT_MAX));
        } catch (Exception e) {
            logger.error("Failed to record admin case view for case {}: {}", caseId, e.getMessage());
            throw new IllegalStateException("Could not record the access audit entry", e);
        }
    }

    /** Who (administrators) viewed a case, newest first. */
    public List<Map<String, Object>> getCaseAccessLog(String caseId) {
        return jdbcTemplate.queryForList(
                "SELECT username, user_role, details, ip_address, created_at FROM audit_logs "
                        + "WHERE action = ? AND entity_type = 'case' AND entity_id = ? "
                        + "ORDER BY created_at DESC LIMIT 200",
                ACTION_ADMIN_CASE_VIEW, caseId);
    }
}
