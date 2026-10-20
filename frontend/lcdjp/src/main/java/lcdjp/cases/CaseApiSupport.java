package lcdjp.cases;

import lcdjp.admin.AuditLogService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.List;

/**
 * Shared plumbing for the case controllers: who is calling, whether they may touch a case, and the
 * small notification helpers several endpoints use. Not a bean itself; the controllers extend it.
 */
public abstract class CaseApiSupport {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseApiSupport.class);

    @Autowired
    protected CaseNotificationRepository caseNotifications;

    @Autowired
    protected CaseAccessService caseAccessService;

    @Autowired
    protected AuditLogService auditLogService;

    /** Every administrator read of case data leaves an audit entry; a failed write refuses the read. */
    protected void auditAdminCaseView(String actor, String caseId, String scope) {
        if (actor != null && isAdministrator(actor)) {
            auditLogService.logAdminCaseView(actor, authenticatedRole(), caseId, scope);
        }
    }

    protected String strVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    protected String authenticatedUsername() {
        return caseAccessService.authenticatedUsername();
    }

    protected String authenticatedRole() {
        return caseAccessService.authenticatedRole();
    }

    protected boolean isAdministrator(String username) {
        return caseAccessService.isAdministrator(username);
    }

    protected boolean canAccessCase(String username, Map<String, Object> caseRow) {
        return caseAccessService.canAccessCase(username, caseRow);
    }

    protected boolean isPreviousHandler(String username, String caseId) {
        return caseAccessService.isPreviousHandler(username, caseId);
    }

    protected List<Map<String, Object>> previousHandlers(String caseId) {
        return caseAccessService.previousHandlers(caseId);
    }

    protected boolean isAssignedLcForCase(String actor, Map<String, Object> caseRow) {
        return caseAccessService.isAssignedLcForCase(actor, caseRow);
    }

    protected ResponseEntity<?> requireCaseActor(String caseId, String username) {
        return caseAccessService.requireCaseActor(caseId, username);
    }

    protected Map<String, Object> singleCase(String caseId) {
        return caseAccessService.singleCase(caseId);
    }

    protected Map<String, Object> userRow(String username) {
        return caseAccessService.userRow(username);
    }

    protected boolean isTruthy(Object value) {
        return value instanceof Boolean ? (Boolean) value
                : value != null && ("1".equals(value.toString())
                                    || "true".equalsIgnoreCase(value.toString()));
    }

    protected void createCitizenNotification(String citizenId, String caseReference, String message) {
        if (citizenId == null || citizenId.isEmpty()) {
            logger.info("⚠️ Cannot create notification: citizenId is null or empty");
            return;
        }
        try {
            String fullMessage = "✅ Your case " + caseReference + " has been submitted. " + message;
            caseNotifications.caseCreated(citizenId, fullMessage, caseReference);
            logger.info("✅ Notification created for citizen: " + citizenId);
        } catch (Exception e) {
            logger.error("❌ Error notifying citizen: " + e.getMessage());
        }
    }

    protected void notifyCitizenCaseAccepted(String caseId, String providerId) {
        try {
            List<Map<String, Object>> result = caseNotifications.findCitizenOfCase(caseId);

            if (!result.isEmpty()) {
                String citizenId = (String) result.get(0).get("citizen_id");

                if (citizenId == null || citizenId.isEmpty()) {
                    logger.info("⚠️ Cannot notify citizen: citizenId is null for case " + caseId);
                    return;
                }

                String message = "✅ Your case " + caseId + " has been accepted by a legal service provider.";
                caseNotifications.caseAccepted(citizenId, message, caseId);
                logger.info("✅ Notification sent to citizen: " + citizenId);
            }
        } catch (Exception e) {
            logger.error("❌ Error notifying citizen: " + e.getMessage());
        }
    }

    protected ResponseEntity<?> requireCaseHandler(String caseId, String username) {
        Map<String, Object> row = singleCase(caseId);
        if (row == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Case not found"));
        }
        if (isAdministrator(username)
                || username.equals(strVal(row.get("current_handler")))
                || username.equals(strVal(row.get("assigned_lc")))
                || username.equals(strVal(row.get("assigned_lawyer")))
                || username.equals(strVal(row.get("selected_lawyer")))) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Only an administrator or this case's assigned handler may change its status"));
    }
}
