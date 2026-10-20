package lcdjp.cases;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.ArrayList;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;

/** Operational endpoints that sit under /api/cases: database backup and health check. */
@RestController
@RequestMapping("/api/cases")
public class CaseOpsController extends CaseApiSupport {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseOpsController.class);
    @Autowired
    private CaseQueryRepository caseQueries;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    @PostMapping("/backup")
    public ResponseEntity<?> backupDatabase() {
        String actor = authenticatedUsername();
        if (actor == null || !isSystemAdministrator(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only a System Administrator may create a database backup"));
        }

        String backupDir = "./backups/";
            new File(backupDir).mkdirs();
            String filename = backupDir + "lcdjp_backup_"
                    + LocalDate.now() + "_" + System.currentTimeMillis() + ".sql";

            String[] target = parseDatasourceTarget(datasourceUrl);
            String host = target[0];
            String port = target[1];
            String database = target[2];

            List<String> command = new ArrayList<>(List.of(
                    "mysqldump",
                    "-h", host,
                    "-P", port,
                    "-u", datasourceUsername,
                    "--databases", database,
                    "--result-file=" + filename
            ));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.environment().put("MYSQL_PWD", datasourcePassword == null ? "" : datasourcePassword);
            pb.redirectErrorStream(true);

            Process process;
            boolean finished;
            try {
                process = pb.start();
                finished = process.waitFor(5, java.util.concurrent.TimeUnit.MINUTES);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Database backup was interrupted", ie);
            } catch (IOException ioe) {
                throw new IllegalStateException("Could not start mysqldump for database backup", ioe);
            }
            int exitCode = finished ? process.exitValue() : -1;
            if (!finished) process.destroyForcibly();

            auditLogService.logAction(
                    actor,
                    "SYSTEM_ADMIN",
                    "DATABASE_BACKUP",
                    "database",
                    database,
                    exitCode == 0 ? "Backup created: " + filename
                                  : "Backup attempt failed (exit code " + exitCode + ")"
            );

            if (exitCode == 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Backup created: " + filename));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Backup failed"));
    }

    private boolean isSystemAdministrator(String username) {
        String role = strVal(userRow(username).get("role")).toUpperCase().replace(' ', '_');
        return role.equals("ADMIN") || role.equals("SYSTEM_ADMIN") || role.equals("SYSTEM_ADMINISTRATOR");
    }

    private String[] parseDatasourceTarget(String jdbcUrl) {
        String host = "localhost";
        String port = "3306";
        String database = "lcdjp";
        if (jdbcUrl != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("jdbc:mysql://([^:/]+)(?::(\\d+))?/([^?]+)")
                    .matcher(jdbcUrl);
            if (m.find()) {
                host = m.group(1);
                if (m.group(2) != null) port = m.group(2);
                database = m.group(3);
            }
        }
        return new String[]{host, port, database};
    }

    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());
        health.put("server", "LCDJP Backend");
        health.put("version", "1.0.0");

        try {
            caseQueries.ping();
            health.put("database", "UP");
        } catch (Exception e) {
            logger.error("❌ Health check database probe failed", e);
            health.put("database", "DOWN");
        }

        return ResponseEntity.ok(health);
    }
}
