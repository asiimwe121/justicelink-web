package lcdjp.common;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

@Component
public class DatabaseInitializer {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DatabaseInitializer.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Value("${system.admin.initial-password:}")
    private String initialAdminPassword;

    // Real, reachable mailbox for the system admin. Every login needs an emailed one-time code, so the account
    // must have an address that can actually receive it.
    @Value("${system.admin.email:}")
    private String systemAdminEmail;

    // Address earlier versions seeded as a placeholder; it is treated the same as "no email".
    private static final String LEGACY_PLACEHOLDER_EMAIL = "admin@lcdjp.gov.ug";

    @PostConstruct
    public void init() {
        try {
            createSystemAdminIfNotExists();
            ensureSystemAdminEmail();
        } catch (Exception e) {
            logger.error("⚠️ Skipping system admin creation: " + e.getMessage());
        }
    }

    private void createSystemAdminIfNotExists() {
        try {
            String checkSql = "SELECT COUNT(*) FROM users WHERE username = 'system_admin'";
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class);

            if (count == null || count == 0) {
                if (initialAdminPassword == null || initialAdminPassword.length() < 12) {
                    logger.warn("SYSTEM_ADMIN_INITIAL_PASSWORD is not configured with at least 12 characters; " +
                            "skipping first-time system admin creation.");
                    return;
                }
                if (!isValidEmail(systemAdminEmail)) {
                    logger.warn("SYSTEM_ADMIN_EMAIL is not configured with a valid address; skipping first-time " +
                            "system admin creation because the account could not receive its login code.");
                    return;
                }

                String hashedInitialPassword = passwordEncoder.encode(initialAdminPassword);

                String insertSql = "INSERT INTO users (username, password_hash, first_name, last_name, role, " +
                        "email, approval_status, is_active, user_type, password_changed, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
                Object[] params = new Object[]{
                        "system_admin",
                        hashedInitialPassword,
                        "System",
                        "Administrator",
                        "SYSTEM_ADMIN",
                        systemAdminEmail.trim(),
                        "Approved",
                        1,
                        "system",
                        false
                };

                jdbcTemplate.update(insertSql, params);

                logger.info("System admin account created from the deployment bootstrap secret. " +
                        "Rotate SYSTEM_ADMIN_INITIAL_PASSWORD after first login.");
            }
        } catch (Exception e) {
            logger.error("❌ Failed to create system admin", e);
        }
    }

    /**
     * Gives an existing system admin a deliverable email. Only fills a missing or placeholder address, so an
     * address the admin chose for themselves is never overwritten, and never reuses an address that belongs to
     * another account.
     */
    private void ensureSystemAdminEmail() {
        try {
            if (!isValidEmail(systemAdminEmail)) {
                return;
            }
            String wanted = systemAdminEmail.trim();

            java.util.List<String> current = jdbcTemplate.queryForList(
                    "SELECT email FROM users WHERE username = 'system_admin'", String.class);
            if (current.isEmpty()) {
                return;
            }
            String existing = current.get(0);
            boolean missing = existing == null || existing.isBlank()
                    || LEGACY_PLACEHOLDER_EMAIL.equalsIgnoreCase(existing.trim());
            if (!missing) {
                return;
            }

            Integer taken = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(?) AND username <> 'system_admin'",
                    Integer.class, wanted);
            if (taken != null && taken > 0) {
                logger.warn("SYSTEM_ADMIN_EMAIL is already registered to another account; " +
                        "system admin email left unchanged.");
                return;
            }

            jdbcTemplate.update("UPDATE users SET email = ? WHERE username = 'system_admin'", wanted);
            logger.info("System admin email set from SYSTEM_ADMIN_EMAIL so login codes can be delivered.");
        } catch (Exception e) {
            logger.error("❌ Failed to set system admin email", e);
        }
    }

    private static boolean isValidEmail(String value) {
        return value != null && value.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    }
}
