package lcdjp.user;

import lcdjp.admin.AuditLogService;
import lcdjp.security.RoleAuthority;
import lcdjp.common.SchedulerLock;
import lcdjp.storage.StoredFileCleanupService;
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

@Service
public class AccountRetentionService {

    private static final Logger logger = LoggerFactory.getLogger(AccountRetentionService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserCaseCleanupService userCaseCleanupService;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private SchedulerLock schedulerLock;

    /** Optional: removes the ID photos and other account files of a purged account from object storage. */
    @Autowired(required = false)
    private StoredFileCleanupService fileCleanup;

    @Value("${app.account-retention.months:6}")
    private int retentionMonths;

    @Scheduled(cron = "${app.account-retention.cron:0 30 2 * * *}")
    public void purgeLongDeactivatedAccounts() {
        // With several replicas every instance fires this cron; only the lock winner runs it.
        schedulerLock.runExclusive("account-retention", Duration.ofMinutes(30), Duration.ofMinutes(10),
                this::runRetentionJob);
    }

    private void runRetentionJob() {
        try {
            int removed = purgeDeactivatedBefore(LocalDateTime.now().minusMonths(retentionMonths));
            if (removed > 0) {
                logger.info("Account retention: removed {} account(s) deactivated for {}+ months",
                        removed, retentionMonths);
            }
        } catch (Exception e) {
            logger.error("Account retention job failed: {}", e.getMessage(), e);
        }
    }

    int purgeDeactivatedBefore(LocalDateTime cutoff) {
        List<Map<String, Object>> due = jdbcTemplate.queryForList(
                "SELECT username, role FROM users "
                        + "WHERE deactivated_at IS NOT NULL AND deactivated_at <= ? "
                        + "AND (LOWER(approval_status) = 'disabled' OR is_active = FALSE)",
                cutoff);

        int removed = 0;
        for (Map<String, Object> row : due) {
            String username = row.get("username") == null ? null : row.get("username").toString();
            String role = row.get("role") == null ? null : row.get("role").toString();
            if (username == null || "system_admin".equals(username) || RoleAuthority.isSystemAdminRole(role)) {
                continue;
            }
            try {
                int casesRemoved = userCaseCleanupService.purgeUserCaseData(username);
                java.util.Set<String> accountFiles = fileCleanup == null
                        ? java.util.Set.of() : fileCleanup.userAccountFiles(username);
                int deleted = jdbcTemplate.update(
                        "DELETE FROM users WHERE username = ? "
                                + "AND deactivated_at IS NOT NULL AND deactivated_at <= ? "
                                + "AND (LOWER(approval_status) = 'disabled' OR is_active = FALSE)",
                        username, cutoff);
                if (deleted > 0) {
                    if (fileCleanup != null) fileCleanup.deleteAfterCommit(accountFiles);
                    removed++;
                    auditLogService.logAction(
                            username,
                            "System",
                            "USER_AUTO_DELETED",
                            "user",
                            username,
                            "Account automatically removed after " + retentionMonths
                                    + " months deactivated; " + casesRemoved + " case(s) removed"
                    );
                }
            } catch (Exception e) {
                logger.error("Account retention: could not remove {} (purge rolled back, will retry next run): {}",
                        username, e.getMessage(), e);
                try {
                    auditLogService.logAction(username, "System", "USER_AUTO_DELETE_FAILED",
                            "user", username, "Automatic removal failed and was rolled back: " + e.getMessage());
                } catch (Exception auditError) {
                    logger.error("Account retention: could not audit failure for {}: {}",
                            username, auditError.getMessage());
                }
            }
        }
        return removed;
    }
}
