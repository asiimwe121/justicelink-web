package lcdjp.legal;

import lcdjp.admin.AuditLogService;
import lcdjp.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.*;

@RestController
@RequestMapping("/api/legal-alerts")

public class LegalAlertsController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LegalAlertsController.class);
    @Autowired
    private LegalAlertRepository alertRepository;

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
            List<Map<String, Object>> alerts = alertRepository.findActive(category);
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

            Long id = alertRepository.insert(title, content, category, priority, audience, createdBy);

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
            int updated = alertRepository.deactivate(id);

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
            List<Map<String, Object>> alerts = alertRepository.findActiveById(id);

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

            if (title == null && content == null && category == null && isActive == null) {
                response.put("success", false);
                response.put("error", "No fields to update");
                return ResponseEntity.badRequest().body(response);
            }

            int updated = alertRepository.update(id, title, content, category, isActive);

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