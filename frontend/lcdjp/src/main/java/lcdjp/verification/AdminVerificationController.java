package lcdjp.verification;

import lcdjp.user.UserAccountRepository;
import lcdjp.storage.FileRefService;
import lcdjp.security.JwtUtil;
import lcdjp.notification.NotificationService;
import lcdjp.cases.StatisticsService;
import lcdjp.user.User;
import lcdjp.user.UserRepository;
import lcdjp.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminVerificationController {

    private final UserAccountRepository userAccounts;
    private final UserService userService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final JwtUtil jwtUtil;
    private final StatisticsService statisticsService;

    /** Optional (not part of the constructor): turns bucket references back into inline data for the review screen. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private FileRefService fileRefService;

    private Map<String, String> callerFromToken(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            String role = jwtUtil.extractRole(token);
            String district = jwtUtil.extractDistrict(token);
            if (username == null) return null;
            return Map.of("username", username, "role", role == null ? "" : role,
                    "district", district == null ? "" : district);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isSystemAdmin(String role) {
        String r = role == null ? "" : role.toLowerCase().trim();
        return r.equals("system_admin") || r.equals("admin") || r.equals("system administrator");
    }

    private boolean isDistrictAdmin(String role) {
        String r = role == null ? "" : role.toLowerCase().trim();
        return r.equals("district_admin") || r.equals("district admin") || r.equals("district administrator");
    }

    private boolean hasDistrictAdminForDistrict(String district) {
        if (district == null || district.trim().isEmpty()) return false;
        int count = userAccounts.countDistrictAdminsInDistrict(district.trim());
        return count > 0;
    }

    private ResponseEntity<?> authorityError(String callerRole, String callerDistrict,
                                              String targetDistrict, Object submittedAtRaw) {
        boolean districtAdminAssigned = hasDistrictAdminForDistrict(targetDistrict);
        boolean overdue = submittedAtRaw instanceof LocalDateTime
                && ((LocalDateTime) submittedAtRaw).isBefore(LocalDateTime.now().minusHours(24));
        boolean systemAdminEscalated = isSystemAdmin(callerRole) && overdue;

        if (districtAdminAssigned && !isDistrictAdmin(callerRole) && !systemAdminEscalated) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "This verification must be reviewed by the District Admin assigned to the applicant's district."));
        }
        if (isDistrictAdmin(callerRole)
                && !(targetDistrict != null && !targetDistrict.trim().isEmpty()
                        && targetDistrict.trim().equalsIgnoreCase(callerDistrict == null ? "" : callerDistrict.trim()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "District Admins can only review verification requests in their assigned district."));
        }
        return null;
    }

    @GetMapping("/verification-requests")
    public ResponseEntity<?> getVerificationRequests(HttpServletRequest httpRequest) {
        Map<String, String> caller = callerFromToken(httpRequest);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        String role = caller.get("role");
        if (!isSystemAdmin(role) && !isDistrictAdmin(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only administrators can view verification requests"));
        }

        List<Map<String, Object>> requests;
        if (isDistrictAdmin(role)) {
            String district = caller.get("district");
            if (district == null || district.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "District Admin has no assigned district."));
            }
            requests = userAccounts.findPendingVerificationRequests(district.trim());
        } else {
            requests = userAccounts.findPendingVerificationRequests(null);
        }
        if (fileRefService != null) {
            // The review screen previews ID photos from inline data, so bring bucket files back in that form.
            for (Map<String, Object> row : requests) {
                Object docs = row.get("verification_documents");
                if (docs instanceof String s) row.put("verification_documents", fileRefService.inlineJsonRefs(s));
            }
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "requests", requests
        ));
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getStatistics() {
        try {
            return ResponseEntity.ok(Map.of("success", true, "statistics", statisticsService.adminStatistics()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not load statistics. Please try again later."));
        }
    }

    @PutMapping("/verify-user/{username}")
    @CacheEvict(value = "statistics", key = "'admin-verification'")
    public ResponseEntity<?> verifyUser(
            @PathVariable String username,
            @Valid @RequestBody VerificationDecisionRequest request,
            HttpServletRequest httpRequest) {

        Map<String, String> caller = callerFromToken(httpRequest);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        String callerRole = caller.get("role");
        if (!isSystemAdmin(callerRole) && !isDistrictAdmin(callerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only administrators can verify users"));
        }

        String status = request.getStatus();
        String reason = request.getReason();

        String adminUsername = caller.get("username");

        User user = userService.findByUsername(username);

        ResponseEntity<?> authError = authorityError(
                callerRole, caller.get("district"), user.getDistrict(), user.getVerificationSubmittedAt());
        if (authError != null) return authError;

        user.setVerificationStatus(status);
        user.setVerificationLevel("VERIFIED".equals(status) ? "VERIFIED" : "BASIC");
        user.setVerificationReviewedAt(LocalDateTime.now());
        user.setVerificationReviewedBy(adminUsername);
        user.setVerificationRejectionReason(reason);
        userRepository.save(user);

        String message = "VERIFIED".equals(status) ?
                "Your account has been verified! You can now access legal aid and case reporting features." :
                "Your verification request was rejected: " + reason;

        notificationService.createNotification(
                username,
                message,
                "VERIFICATION_RESULT",
                "admin", "System Admin", "Admin"
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User " + username + " " + status
        ));
    }
    @PostMapping("/migrate-existing-users")
    @CacheEvict(value = "statistics", key = "'admin-verification'")
    public ResponseEntity<?> migrateExistingUsers() {
        int updated = userAccounts.markUnverifiedUsersVerified();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Migrated " + updated + " users to VERIFIED"
        ));
    }
}