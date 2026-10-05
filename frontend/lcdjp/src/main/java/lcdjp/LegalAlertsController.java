package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.*;

@RestController
@RequestMapping("/api/legal-alerts")

public class LegalAlertsController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LegalAlertsController.class);
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private JwtUtil jwtUtil;

    private boolean isDistrictAdminRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return false;
        }
        try {
            String token = authHeader.substring(7).trim();
            if (!jwtUtil.validateToken(token)) return false;
            String role = jwtUtil.extractRole(token);
            if (role == null) return false;
            String normalized = role.trim().toUpperCase().replace(' ', '_');
            return normalized.equals("DISTRICT_ADMIN");
        } catch (Exception e) {
            return false;
        }
    }

    private ResponseEntity<Map<String, Object>> districtAdminDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("success", false, "error", "District Admins do not have access to Legal Alerts"));
    }

    @GetMapping
    public ResponseEntity<?> getAllAlerts(
            @RequestParam(required = false) String category,
            HttpServletRequest request) {
        if (isDistrictAdminRequest(request)) return districtAdminDenied();
        try {
            String sql = "SELECT id, title, content, category, priority, audience, created_by, created_at, is_active " +
                    "FROM legal_alerts WHERE is_active = TRUE ";
            List<Object> params = new ArrayList<>();

            if (category != null && !category.isEmpty()) {
                sql += "AND category = ? ";
                params.add(category);
            }
            sql += "ORDER BY created_at DESC LIMIT 100";

            List<Map<String, Object>> alerts = jdbcTemplate.queryForList(sql, params.toArray());
            return ResponseEntity.ok(alerts);

        } catch (Exception e) {
            logger.error("Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PostMapping
    public ResponseEntity<?> createAlert(@Valid @RequestBody LegalAlertCreateRequest request,
                                          HttpServletRequest httpRequest) {
        if (isDistrictAdminRequest(httpRequest)) return districtAdminDenied();
        Map<String, Object> response = new HashMap<>();
        try {
            String title = request.getTitle();
            String content = request.getContent() == null ? "" : request.getContent();
            String category = request.getCategory() == null ? "General" : request.getCategory();
            String createdBy = "admin";
            String priority = request.getPriority() == null ? "medium" : request.getPriority();
            String audience = request.getAudience() == null ? "all" : request.getAudience();

            if (!Set.of("low", "medium", "high", "urgent").contains(priority)) {
                priority = "medium";
            }
            if (!Set.of("all", "citizens", "lawyers", "admins").contains(audience)) {
                audience = "all";
            }

            if (title.isEmpty()) {
                response.put("success", false);
                response.put("error", "Title is required");
                return ResponseEntity.badRequest().body(response);
            }

            jdbcTemplate.update(
                    "INSERT INTO legal_alerts (title, content, category, priority, audience, created_by, is_active) " +
                            "VALUES (?, ?, ?, ?, ?, ?, 1)",
                    title, content, category, priority, audience, createdBy
            );

            Long id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

            if (auditLogService != null) {
                auditLogService.logAction(
                        createdBy,
                        "Admin",
                        "ALERT_CREATED",
                        "alert",
                        String.valueOf(id),
                        "Legal alert created: " + title
                );
            }

            response.put("success", true);
            response.put("id", id);
            response.put("message", "Alert created successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Unexpected error", e);
            response.put("success", false);
            response.put("error", "Request could not be processed. Please try again later.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAlert(@PathVariable Long id, HttpServletRequest httpRequest) {
        if (isDistrictAdminRequest(httpRequest)) return districtAdminDenied();
        Map<String, Object> response = new HashMap<>();
        try {
            int updated = jdbcTemplate.update("UPDATE legal_alerts SET is_active = FALSE WHERE id = ?", id);

            if (updated == 0) {
                response.put("success", false);
                response.put("error", "Alert not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            if (auditLogService != null) {
                auditLogService.logAction(
                        "admin",
                        "Admin",
                        "ALERT_DELETED",
                        "alert",
                        String.valueOf(id),
                        "Legal alert deactivated"
                );
            }

            response.put("success", true);
            response.put("message", "Alert deactivated");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Unexpected error", e);
            response.put("success", false);
            response.put("error", "Request could not be processed. Please try again later.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAlertById(@PathVariable Long id, HttpServletRequest httpRequest) {
        if (isDistrictAdminRequest(httpRequest)) return districtAdminDenied();
        try {
            String sql = "SELECT id, title, content, category, created_by, created_at, is_active " +
                    "FROM legal_alerts WHERE id = ? AND is_active = TRUE";

            List<Map<String, Object>> alerts = jdbcTemplate.queryForList(sql, id);

            if (alerts.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Alert not found"));
            }

            return ResponseEntity.ok(alerts.get(0));
        } catch (Exception e) {
            logger.error("Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAlert(@PathVariable Long id,
                                          @Valid @RequestBody LegalAlertUpdateRequest request,
                                          HttpServletRequest httpRequest) {
        if (isDistrictAdminRequest(httpRequest)) return districtAdminDenied();
        Map<String, Object> response = new HashMap<>();
        try {
            String title = request.getTitle();
            String content = request.getContent();
            String category = request.getCategory();
            Boolean isActive = request.getIsActive();

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
                response.put("success", false);
                response.put("error", "No fields to update");
                return ResponseEntity.badRequest().body(response);
            }

            params.add(id);
            String sql = "UPDATE legal_alerts SET " + String.join(", ", updates) + " WHERE id = ?";

            int updated = jdbcTemplate.update(sql, params.toArray());

            if (updated == 0) {
                response.put("success", false);
                response.put("error", "Alert not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            response.put("success", true);
            response.put("message", "Alert updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Unexpected error", e);
            response.put("success", false);
            response.put("error", "Request could not be processed. Please try again later.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}