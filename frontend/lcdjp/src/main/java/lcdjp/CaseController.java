package lcdjp;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CaseController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/test-db")
    public Map<String, Object> testDatabase() {
        Map<String, Object> response = new HashMap<>();
        try {
            jdbcTemplate.execute("SELECT 1");
            response.put("status", "success");
            response.put("message", "Database connected!");
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PutMapping("/cases/update/{caseReference}")
    public Map<String, Object> updateCase(@PathVariable String caseReference, @RequestBody Map<String, Object> updates) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (updates.containsKey("status")) {
                jdbcTemplate.update("UPDATE cases SET status = ? WHERE case_reference = ?",
                        updates.get("status"), caseReference);
            }
            if (updates.containsKey("current_level")) {
                jdbcTemplate.update("UPDATE cases SET current_level = ? WHERE case_reference = ?",
                        updates.get("current_level"), caseReference);
            }
            if (updates.containsKey("legal_advice")) {
                jdbcTemplate.update("UPDATE cases SET legal_advice = ? WHERE case_reference = ?",
                        updates.get("legal_advice"), caseReference);
            }
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }

    @PostMapping("/cases/save")
    public Map<String, Object> saveCase(@RequestBody Map<String, Object> caseData) {
        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println("Received case data: " + caseData);

            String caseReference = "CASE" + System.currentTimeMillis();
            int defaultCitizenId = 1;

            String sql = "INSERT INTO cases (case_reference, case_type, description, current_level, " +
                    "village, parish, status, citizen_id, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";

            jdbcTemplate.update(sql,
                    caseReference,
                    caseData.get("caseType"),
                    caseData.get("description"),
                    "LC1",
                    caseData.get("village"),
                    caseData.get("parish"),
                    "Pending",
                    defaultCitizenId
            );

            response.put("success", true);
            response.put("caseId", caseReference);
            System.out.println("✅ Case saved: " + caseReference);

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    @GetMapping("/cases/level/{level}")
    public List<Map<String, Object>> getCasesByLevel(@PathVariable String level) {
        String sql = "SELECT * FROM cases WHERE current_level = ? ORDER BY created_at DESC";
        return jdbcTemplate.queryForList(sql, level);
    }

    @GetMapping("/messages/test/{caseReference}")
    public Map<String, Object> testGetCaseId(@PathVariable String caseReference) {
        Map<String, Object> response = new HashMap<>();
        try {
            String sql = "SELECT case_id FROM cases WHERE case_reference = ?";
            Integer caseDbId = jdbcTemplate.queryForObject(sql, Integer.class, caseReference);
            response.put("case_reference", caseReference);
            response.put("case_db_id", caseDbId);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }

    @PostMapping("/messages/save")
    public Map<String, Object> saveMessage(@RequestBody Map<String, Object> messageData) {
        Map<String, Object> response = new HashMap<>();
        try {
            String getCaseIdSql = "SELECT case_id FROM cases WHERE case_reference = ?";
            Integer caseDbId = jdbcTemplate.queryForObject(getCaseIdSql, Integer.class, messageData.get("caseId"));

            // Use existing user IDs from your database
            int senderId = 4;  // caesar123
            int receiverId = 1; // testuser

            String sql = "INSERT INTO messages (case_id, sender_id, receiver_id, sender_role, message_text, is_read, sent_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, NOW())";

            jdbcTemplate.update(sql,
                    caseDbId,
                    senderId,
                    receiverId,
                    messageData.get("senderRole"),
                    messageData.get("message"),
                    0
            );

            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }
    @GetMapping("/messages/case/{caseReference}")
    public List<Map<String, Object>> getMessages(@PathVariable String caseReference) {
        String sql = "SELECT m.message_id, m.sender_role, m.message_text, m.is_read, m.sent_at " +
                "FROM messages m " +
                "JOIN cases c ON m.case_id = c.case_id " +
                "WHERE c.case_reference = ? " +
                "ORDER BY m.sent_at ASC";
        return jdbcTemplate.queryForList(sql, caseReference);
    }
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, Object> loginData) {
        Map<String, Object> response = new HashMap<>();
        try {
            String username = loginData.get("username").toString();
            String role = loginData.get("role").toString();

            String sql = "SELECT user_id, username, role FROM users WHERE username = ? AND role = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(sql, username, role);

            if (users.isEmpty()) {
                response.put("success", false);
                response.put("message", "Invalid username or role");
                return response;
            }

            Map<String, Object> user = users.get(0);
            response.put("success", true);
            response.put("user", user);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
    @GetMapping("/statistics")
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        try {
            // Total cases
            Integer totalCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases", Integer.class);
            stats.put("totalCases", totalCases);

            // Cases by status
            Integer pendingCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE status = 'Pending'", Integer.class);
            Integer resolvedCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE status = 'Resolved'", Integer.class);
            Integer forwardedCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE status LIKE 'Forwarded%'", Integer.class);
            stats.put("pendingCases", pendingCases);
            stats.put("resolvedCases", resolvedCases);
            stats.put("forwardedCases", forwardedCases);

            // Cases by level
            Integer lc1Cases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE current_level = 'LC1'", Integer.class);
            Integer lc2Cases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE current_level = 'LC2'", Integer.class);
            Integer lc3Cases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE current_level = 'LC3'", Integer.class);
            Integer lawyerCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE current_level = 'Lawyer Panel Desk'", Integer.class);
            stats.put("lc1Cases", lc1Cases);
            stats.put("lc2Cases", lc2Cases);
            stats.put("lc3Cases", lc3Cases);
            stats.put("lawyerCases", lawyerCases);

            // Cases by type
            Integer landCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE case_type LIKE '%Land%'", Integer.class);
            Integer familyCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE case_type LIKE '%Family%'", Integer.class);
            Integer businessCases = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM cases WHERE case_type LIKE '%Business%'", Integer.class);
            stats.put("landCases", landCases);
            stats.put("familyCases", familyCases);
            stats.put("businessCases", businessCases);

        } catch (Exception e) {
            stats.put("error", e.getMessage());
        }
        return stats;
    }
    @GetMapping("/export/cases")
    public Map<String, Object> exportCases() {
        Map<String, Object> response = new HashMap<>();
        try {
            String sql = "SELECT case_reference, case_type, description, current_level, status, created_at FROM cases ORDER BY created_at DESC";
            List<Map<String, Object>> cases = jdbcTemplate.queryForList(sql);
            response.put("success", true);
            response.put("cases", cases);
            response.put("total", cases.size());
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }
    @PostMapping("/send-email")
    public Map<String, Object> sendEmail(@RequestBody Map<String, Object> emailData) {
        Map<String, Object> response = new HashMap<>();
        try {
            String to = emailData.get("to").toString();
            String subject = emailData.get("subject").toString();
            String body = emailData.get("body").toString();

            // For now, just log it
            System.out.println("Email would be sent to: " + to);
            System.out.println("Subject: " + subject);
            System.out.println("Body: " + body);

            response.put("success", true);
            response.put("message", "Email notification sent");
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }
}