package lcdjp.cases;

import lcdjp.chat.AddMessageRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.List;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/** Messages on a case. */
@RestController
@RequestMapping("/api/cases")
public class CaseMessageController extends CaseApiSupport {

    @Autowired
    private CaseMessageRepository caseMessages;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseMessageController.class);

    @PostMapping("/{caseId}/messages")
    public ResponseEntity<?> addMessage(
            @PathVariable String caseId,
            @Valid @RequestBody AddMessageRequest messageData,
            HttpServletRequest httpRequest) {

            String fromUsername = authenticatedUsername();
            if (fromUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            Map<String, Object> caseRow = singleCase(caseId);
            if (caseRow == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Case not found"));
            }
            String caseCitizen = strVal(caseRow.get("citizen_id"));
            String currentHandler = strVal(caseRow.get("current_handler"));
            String assignedLc = strVal(caseRow.get("assigned_lc"));
            String assignedLawyer = strVal(caseRow.get("assigned_lawyer"));
            if (!isAdministrator(fromUsername)
                    && !fromUsername.equals(caseCitizen)
                    && !fromUsername.equals(currentHandler)
                    && !fromUsername.equals(assignedLc)
                    && !fromUsername.equals(assignedLawyer)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Previous handlers have view-only access to this case"));
            }
            if (!isAdministrator(fromUsername)
                    && isTruthy(caseRow.get("messaging_locked"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Messaging is locked for this case"));
            }

            Map<String, Object> actor = userRow(fromUsername);
            String from = strVal(actor.get("role"));
            String fromName = (strVal(actor.get("first_name")) + " "
                    + strVal(actor.get("last_name"))).trim();
            String text = messageData.getText();
            String sentTo = fromUsername.equals(caseCitizen) ? currentHandler : caseCitizen;
            String sentToRole = fromUsername.equals(caseCitizen)
                    ? strVal(caseRow.get("handler_role")) : "Citizen";
            Boolean read = messageData.getRead();
            Boolean preAcceptance = messageData.getPreAcceptance();
            String timestamp = normalizeTimestamp(messageData.getTimestamp());

            caseMessages.insert(caseId, from, fromName, fromUsername, text,
                    sentTo, sentToRole, timestamp,
                    read != null && read,
                    preAcceptance != null && preAcceptance);

            auditLogService.logAction(
                    fromUsername, fromName, "MESSAGE_ADDED", "case", caseId,
                    "Message added by " + fromName + " (" + from + ")"
            );

            return ResponseEntity.ok(Map.of("success", true, "message", "Message sent successfully"));
    }

    @GetMapping("/{caseId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable String caseId) {
            String actor = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, actor);
            if (denied != null) return denied;
            auditAdminCaseView(actor, caseId, "messages");
            List<Map<String, Object>> messages = caseMessages.findByCase(caseId);
            return ResponseEntity.ok(messages);
    }

    @PutMapping("/{caseId}/messages/{messageId}/read")
    public ResponseEntity<?> markMessageAsRead(
            @PathVariable String caseId,
            @PathVariable Integer messageId) {
            String actor = authenticatedUsername();
            ResponseEntity<?> denied = requireCaseActor(caseId, actor);
            if (denied != null) return denied;
            int updated = caseMessages.markRead(messageId, caseId);

            if (updated > 0) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Message marked as read"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Message not found"));
    }

    private String normalizeTimestamp(Object timestampObj) {
        if (timestampObj == null) {
            return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }

        try {
            if (timestampObj instanceof java.sql.Timestamp) {
                java.sql.Timestamp ts = (java.sql.Timestamp) timestampObj;
                return ts.toLocalDateTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            } else if (timestampObj instanceof java.util.Date) {
                java.util.Date date = (java.util.Date) timestampObj;
                return new java.sql.Timestamp(date.getTime())
                        .toLocalDateTime()
                        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            } else if (timestampObj instanceof String) {
                String ts = (String) timestampObj;

                if (ts.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.*")) {
                    return ts.split("\\.")[0];
                }

                try {
                    LocalDateTime dateTime = LocalDateTime.parse(ts);
                    return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                } catch (Exception e) {
                    try {
                        DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
                        LocalDateTime dateTime = LocalDateTime.parse(ts, formatter);
                        return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    } catch (Exception e2) {
                        return ts;
                    }
                }
            } else {
                return timestampObj.toString();
            }
        } catch (Exception e) {
            logger.error("Error normalizing timestamp: " + e.getMessage());
            return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
    }
}
