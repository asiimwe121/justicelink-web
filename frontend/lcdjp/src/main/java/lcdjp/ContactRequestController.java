package lcdjp;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/contact-requests")

public class ContactRequestController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(ContactRequestController.class);
    private static final int CONTACT_REQUEST_CAP = 1000;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/incoming/{username}")
    public ResponseEntity<?> getIncomingContactRequests(@PathVariable String username) {
        try {
            ResponseEntity<?> denied = requireActor(username, false);
            if (denied != null) return denied;

            String checkTable = "SHOW TABLES LIKE 'contact_requests'";
            List<Map<String, Object>> tableExists = jdbcTemplate.queryForList(checkTable);

            if (tableExists.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            String sql = "SELECT * FROM contact_requests WHERE recipient = ? AND status = 'pending' ORDER BY created_at DESC LIMIT ?";
            List<Map<String, Object>> requests = jdbcTemplate.queryForList(sql, username, CONTACT_REQUEST_CAP);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            logger.error("❌ Error fetching contact requests: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/sent/{username}")
    public ResponseEntity<?> getSentContactRequests(@PathVariable String username) {
        try {
            ResponseEntity<?> denied = requireActor(username, false);
            if (denied != null) return denied;
            String checkTable = "SHOW TABLES LIKE 'contact_requests'";
            List<Map<String, Object>> tableExists = jdbcTemplate.queryForList(checkTable);

            if (tableExists.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            String sql = "SELECT * FROM contact_requests WHERE sender = ? ORDER BY created_at DESC LIMIT ?";
            List<Map<String, Object>> requests = jdbcTemplate.queryForList(sql, username, CONTACT_REQUEST_CAP);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            logger.error("❌ Error fetching sent contact requests: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserContactRequests(@PathVariable String username) {
        try {
            ResponseEntity<?> denied = requireActor(username, false);
            if (denied != null) return denied;
            String checkTable = "SHOW TABLES LIKE 'contact_requests'";
            List<Map<String, Object>> tableExists = jdbcTemplate.queryForList(checkTable);

            if (tableExists.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            String sql = "SELECT * FROM contact_requests WHERE sender = ? OR recipient = ? ORDER BY created_at DESC LIMIT ?";
            List<Map<String, Object>> requests = jdbcTemplate.queryForList(sql, username, username, CONTACT_REQUEST_CAP);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            logger.error("❌ Error fetching user contact requests: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping
    public ResponseEntity<?> createContactRequest(
            @Valid @RequestBody ContactRequestCreateRequest requestData) {
        try {
            String sender = authenticatedUsername();
            if (sender == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            String recipient = requestData.getRecipient();
            String message = requestData.getMessage();

            String checkTable = "SHOW TABLES LIKE 'contact_requests'";
            List<Map<String, Object>> tableExists = jdbcTemplate.queryForList(checkTable);

            if (tableExists.isEmpty()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("error", "Contact requests table not configured"));
            }

            String sql = "INSERT INTO contact_requests (sender, recipient, message, status, created_at) VALUES (?, ?, ?, 'pending', NOW())";
            jdbcTemplate.update(sql, sender, recipient, message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Contact request sent"));
        } catch (Exception e) {
            logger.error("❌ Error creating contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create contact request. Please try again later."));
        }
    }

    @PutMapping("/{requestId}/accept")
    public ResponseEntity<?> acceptContactRequest(@PathVariable Integer requestId) {
        try {
            String selectSql = "SELECT sender, recipient FROM contact_requests WHERE id = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(selectSql, requestId);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Contact request not found"));
            }

            Map<String, Object> request = results.get(0);
            String sender = (String) request.get("sender");
            String recipient = (String) request.get("recipient");
            ResponseEntity<?> denied = requireActor(recipient, false);
            if (denied != null) return denied;

            String updateSql = "UPDATE contact_requests SET status = 'accepted', updated_at = NOW() WHERE id = ?";
            jdbcTemplate.update(updateSql, requestId);

            String notifSql = "INSERT INTO notifications (username, type, message_text, is_read, timestamp) VALUES (?, 'contact_accepted', ?, false, NOW())";
            String message = recipient + " has accepted your contact request.";
            jdbcTemplate.update(notifSql, sender, message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Contact request accepted"));
        } catch (Exception e) {
            logger.error("❌ Error accepting contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to accept contact request. Please try again later."));
        }
    }

    @PutMapping("/{requestId}/deny")
    public ResponseEntity<?> denyContactRequest(@PathVariable Integer requestId) {
        try {
            String selectSql = "SELECT sender FROM contact_requests WHERE id = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(selectSql, requestId);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Contact request not found"));
            }

            Map<String, Object> request = results.get(0);
            String sender = (String) request.get("sender");
            List<Map<String, Object>> recipientRows = jdbcTemplate.queryForList(
                    "SELECT recipient FROM contact_requests WHERE id = ?", requestId);
            String recipient = recipientRows.isEmpty() ? null
                    : (String) recipientRows.get(0).get("recipient");
            ResponseEntity<?> denied = requireActor(recipient, false);
            if (denied != null) return denied;

            String updateSql = "UPDATE contact_requests SET status = 'denied', updated_at = NOW() WHERE id = ?";
            jdbcTemplate.update(updateSql, requestId);

            String notifSql = "INSERT INTO notifications (username, type, message_text, is_read, timestamp) VALUES (?, 'contact_denied', ?, false, NOW())";
            String message = "Your contact request has been declined.";
            jdbcTemplate.update(notifSql, sender, message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Contact request denied"));
        } catch (Exception e) {
            logger.error("❌ Error denying contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to deny contact request. Please try again later."));
        }
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<?> deleteContactRequest(@PathVariable Integer requestId) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT sender, recipient FROM contact_requests WHERE id = ?", requestId);
            if (rows.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Contact request not found"));
            }
            String actor = authenticatedUsername();
            String sender = (String) rows.get(0).get("sender");
            String recipient = (String) rows.get(0).get("recipient");
            if (actor == null || (!actor.equals(sender) && !actor.equals(recipient)
                    && !isAdministrator(actor))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You may only delete your own contact requests"));
            }
            String sql = "DELETE FROM contact_requests WHERE id = ?";
            int deleted = jdbcTemplate.update(sql, requestId);
            if (deleted > 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Contact request deleted"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Contact request not found"));
        } catch (Exception e) {
            logger.error("❌ Error deleting contact request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete contact request. Please try again later."));
        }
    }

    private String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            String username = ((User) principal).getUsername();
            return username == null || username.isBlank() ? null : username;
        }
        String name = authentication.getName();
        return name == null || "anonymousUser".equals(name) ? null : name;
    }

    private ResponseEntity<?> requireActor(String requested, boolean adminOnly) {
        String actor = authenticatedUsername();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        if ((adminOnly && !isAdministrator(actor))
                || (!adminOnly && !actor.equals(requested) && !isAdministrator(actor))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You may only access your own contact requests"));
        }
        return null;
    }

    private boolean isAdministrator(String username) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT role FROM users WHERE username = ?", username);
        if (rows.isEmpty() || rows.get(0).get("role") == null) return false;
        String role = rows.get(0).get("role").toString().toUpperCase().replace(' ', '_');
        return role.equals("ADMIN") || role.equals("SYSTEM_ADMIN")
                || role.equals("SYSTEM_ADMINISTRATOR") || role.equals("DISTRICT_ADMIN");
    }
}