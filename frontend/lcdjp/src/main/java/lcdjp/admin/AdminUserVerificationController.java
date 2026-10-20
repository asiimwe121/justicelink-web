package lcdjp.admin;

import lcdjp.security.RequestIdentity;
import lcdjp.security.RoleAuthority;
import lcdjp.verification.VerificationDecisionRequest;
import lcdjp.verification.VerificationDecisionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Identity-verification decisions and status (split out of AdminUserController, same /api/auth URLs):
 * approve / reject a verification, and read or set a user's verification status.
 */
@RestController
@RequestMapping("/api/auth")
public class AdminUserVerificationController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(AdminUserVerificationController.class);

    @Autowired
    private AdminUserRepository adminUsers;

    @Autowired
    private RequestIdentity requestIdentity;

    @Autowired
    private VerificationDecisionService verificationDecisionService;

    @PutMapping("/users/{username}/verify/approve")
    public ResponseEntity<?> approveVerification(@PathVariable String username,
                                                 @RequestBody(required = false) Map<String, Object> body,
                                                 HttpServletRequest request) {
        try {
            String adminUsername = requestIdentity.resolveUsername(request);
            if (adminUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            String role = requestIdentity.resolveRole(request, adminUsername);
            if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only admins can approve verification"));
            }

            String district = requestIdentity.resolveDistrict(request, adminUsername);
            return verificationDecisionService.approve(adminUsername, role, district, username);

        } catch (Exception e) {
            logger.error("❌ Error approving verification: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PutMapping("/users/{username}/verify/reject")
    public ResponseEntity<?> rejectVerification(@PathVariable String username,
                                                @Valid @RequestBody VerificationDecisionRequest request,
                                                HttpServletRequest httpRequest) {
        try {
            String adminUsername = requestIdentity.resolveUsername(httpRequest);
            if (adminUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            String role = requestIdentity.resolveRole(httpRequest, adminUsername);
            if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only admins can reject verification"));
            }

            String district = requestIdentity.resolveDistrict(httpRequest, adminUsername);
            return verificationDecisionService.reject(adminUsername, role, district, username, request.getReason());

        } catch (Exception e) {
            logger.error("❌ Error rejecting verification: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/users/{username}/verification-status")
    public ResponseEntity<?> getVerificationStatus(@PathVariable String username,
                                                   HttpServletRequest httpRequest) {
        try {

            if (username == null || username.isEmpty() || "null".equals(username) || "undefined".equals(username)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid username provided"));
            }

            String requesterUsername = requestIdentity.resolveUsername(httpRequest);
            if (requesterUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            String requesterRole = requestIdentity.resolveRole(httpRequest, requesterUsername);
            boolean isSelf = requesterUsername.equalsIgnoreCase(username);
            if (!isSelf && !RoleAuthority.isSystemAdminRole(requesterRole) && !RoleAuthority.isDistrictAdminRole(requesterRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only access your own verification status"));
            }

            List<Map<String, Object>> results = adminUsers.findVerificationStatus(username);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            Map<String, Object> result = results.get(0);
            String status = (String) result.getOrDefault("verification_status", "NOT_SUBMITTED");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("verificationStatus", status != null ? status : "NOT_SUBMITTED");
            response.put("submittedAt", result.get("verification_submitted_at"));
            response.put("reviewedAt", result.get("verification_reviewed_at"));
            response.put("reviewedBy", result.get("verification_reviewed_by"));
            response.put("rejectionReason", result.get("verification_rejection_reason"));

            String message = "";
            String statusStr = status != null ? status : "NOT_SUBMITTED";
            switch (statusStr) {
                case "PENDING":
                    message = "⏳ Your documents are pending verification. Please wait for admin approval.";
                    break;
                case "APPROVED":
                    message = "✅ Your identity is verified. You have full access to all features.";
                    break;
                case "REJECTED":
                    message = "❌ Your verification was rejected. Please re-submit your documents.";
                    break;
                default:
                    message = "📄 Please verify your identity to access all features.";
                    break;
            }
            response.put("message", message);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Error fetching verification status: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PutMapping("/users/{username}/verification-status")
    public ResponseEntity<?> updateVerificationStatus(@PathVariable String username,
                                                      @Valid @RequestBody VerificationDecisionRequest request,
                                                      HttpServletRequest httpRequest) {
        try {
            String adminUsername = requestIdentity.resolveUsername(httpRequest);
            if (adminUsername == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            String role = requestIdentity.resolveRole(httpRequest, adminUsername);
            if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only admins can update verification status"));
            }

            String status = request.getStatus();
            if (status == null || status.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Status is required"));
            }
            status = status.trim().toUpperCase();
            if (!"APPROVED".equals(status) && !"REJECTED".equals(status)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Status must be APPROVED or REJECTED"));
            }

            String district = requestIdentity.resolveDistrict(httpRequest, adminUsername);

            ResponseEntity<?> result = "APPROVED".equals(status)
                    ? verificationDecisionService.approve(adminUsername, role, district, username)
                    : verificationDecisionService.reject(adminUsername, role, district, username, request.getReason());

            Object rawBody = result.getBody();
            if (result.getStatusCode().is2xxSuccessful() && rawBody instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = new HashMap<>((Map<String, Object>) rawBody);
                body.put("status", status);
                return ResponseEntity.status(result.getStatusCode()).body(body);
            }
            return result;

        } catch (Exception e) {
            logger.error("❌ Error updating verification status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }
}
