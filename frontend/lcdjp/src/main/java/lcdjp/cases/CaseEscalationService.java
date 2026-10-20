package lcdjp.cases;

import lcdjp.admin.AuditLogService;
import lcdjp.security.RoleAuthority;
import lcdjp.common.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Flags cases nobody has acted on. A case counts as unactioned while it is still open and has no
 * accepted_date. After {@code app.escalation.days} days the district admin is notified; after twice
 * that, system admins are notified as well. Each level fires once per case (escalation_level).
 * Notifications carry only the case reference, never names or case content.
 */
@Service
public class CaseEscalationService {

    private static final Logger logger = LoggerFactory.getLogger(CaseEscalationService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private SchedulerLock schedulerLock;

    @Value("${app.escalation.days:3}")
    private int escalationDays;

    /** Pure rule, kept separate so it can be tested without a database. */
    static int targetLevel(LocalDateTime createdAt, LocalDateTime now, int days, boolean urgent) {
        if (createdAt == null || days <= 0) return 0;
        // Urgent reports (detention, protection) escalate on a much shorter clock.
        long thresholdHours = urgent ? Math.max(1, days * 24L / 6) : days * 24L;
        long hours = Duration.between(createdAt, now).toHours();
        if (hours >= thresholdHours * 2) return 2;
        if (hours >= thresholdHours) return 1;
        return 0;
    }

    @Scheduled(cron = "${app.escalation.cron:0 15 * * * *}")
    public void escalateStaleCases() {
        // With several replicas every instance fires this cron; only the lock winner runs it, so
        // admins get one escalation notification per case instead of one per replica.
        schedulerLock.runExclusive("case-escalation", Duration.ofMinutes(10), Duration.ofMinutes(5),
                this::runEscalationJob);
    }

    private void runEscalationJob() {
        try {
            int n = runEscalation(LocalDateTime.now());
            if (n > 0) logger.info("Case escalation: raised {} case(s)", n);
        } catch (Exception e) {
            logger.error("Case escalation job failed: {}", e.getMessage(), e);
        }
    }

    int runEscalation(LocalDateTime now) {
        List<Map<String, Object>> open = jdbcTemplate.queryForList(
                "SELECT case_reference, district, created_at, escalation_level, "
                        + "COALESCE(jurisdiction_urgent, FALSE) AS urgent "
                        + "FROM cases "
                        + "WHERE accepted_date IS NULL AND created_at IS NOT NULL "
                        + "AND COALESCE(status, 'Pending') NOT IN ('Resolved', 'Closed') "
                        + "AND escalation_level < 2");

        int raised = 0;
        for (Map<String, Object> row : open) {
            String ref = str(row.get("case_reference"));
            if (ref == null) continue;
            LocalDateTime created = toLdt(row.get("created_at"));
            int current = row.get("escalation_level") == null ? 0
                    : ((Number) row.get("escalation_level")).intValue();
            boolean urgent = Boolean.TRUE.equals(row.get("urgent"))
                    || (row.get("urgent") instanceof Number && ((Number) row.get("urgent")).intValue() != 0);
            int target = targetLevel(created, now, escalationDays, urgent);
            if (target <= current) continue;

            try {
                String district = str(row.get("district"));
                notifyAdmins(ref, district, target);
                jdbcTemplate.update(
                        "UPDATE cases SET escalation_level = ?, escalated_at = NOW() WHERE case_reference = ?",
                        target, ref);
                auditLogService.logAction("system", "System", "CASE_ESCALATED", "case", ref,
                        "Escalated to level " + target + " (no action taken)");
                raised++;
            } catch (Exception e) {
                // One bad case must not stop the rest; it will be retried on the next run.
                logger.error("Could not escalate case {}: {}", ref, e.getMessage());
            }
        }
        return raised;
    }

    private void notifyAdmins(String ref, String district, int level) {
        String message = "Case " + ref + " has had no action for several days"
                + (level >= 2 ? " and needs urgent attention." : ". Please review or reassign it.");

        List<Map<String, Object>> admins = jdbcTemplate.queryForList(
                "SELECT username, role, district FROM users WHERE is_active = TRUE");
        for (Map<String, Object> admin : admins) {
            String role = str(admin.get("role"));
            String username = str(admin.get("username"));
            if (username == null) continue;
            boolean districtMatch = RoleAuthority.isDistrictAdminRole(role)
                    && district != null && district.equalsIgnoreCase(str(admin.get("district")));
            boolean system = level >= 2 && RoleAuthority.isSystemAdminRole(role);
            if (districtMatch || system) {
                jdbcTemplate.update(
                        "INSERT INTO notifications (username, message, type, case_reference, is_read, timestamp) "
                                + "VALUES (?, ?, 'case_escalation', ?, FALSE, NOW())",
                        username, message, ref);
            }
        }
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static LocalDateTime toLdt(Object o) {
        if (o instanceof java.sql.Timestamp) return ((java.sql.Timestamp) o).toLocalDateTime();
        if (o instanceof LocalDateTime) return (LocalDateTime) o;
        return null;
    }
}
