package lcdjp;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VerificationDecisionService {

    private final UserService userService;
    private final UserRepository userRepository;
    private final VerificationAuthorityService verificationAuthorityService;
    private final NotificationService notificationService;

    @Transactional
    public ResponseEntity<?> approve(String reviewerUsername,
                                     String reviewerRole,
                                     String reviewerDistrict,
                                     String username) {
        User user = findTarget(username);
        ResponseEntity<?> authorityError = authorityError(
                reviewerRole, reviewerDistrict, user, "approved");
        if (authorityError != null) {
            return authorityError;
        }

        String requestedRole = user.getRequestedRole();
        if (requestedRole != null && !requestedRole.trim().isEmpty()) {
            user.setRole(verificationAuthorityService.normalizeVerificationRole(requestedRole));
        }
        user.setApprovalStatus("Approved");
        user.setVerificationStatus("APPROVED");
        user.setVerificationLevel("VERIFIED");
        user.setVerificationReviewedAt(LocalDateTime.now());
        user.setVerificationReviewedBy(reviewerUsername);
        user.setVerificationRejectionReason(null);
        userRepository.save(user);

        notificationService.createNotification(
                username,
                "Your verification request has been approved.",
                "VERIFICATION_RESULT",
                reviewerUsername,
                "LCDJP Administrator",
                reviewerRole == null ? "Admin" : reviewerRole
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User " + username + " approved",
                "status", "APPROVED",
                "role", user.getRole() == null ? "" : user.getRole()
        ));
    }

    @Transactional
    public ResponseEntity<?> reject(String reviewerUsername,
                                    String reviewerRole,
                                    String reviewerDistrict,
                                    String username,
                                    String reason) {
        User user = findTarget(username);
        ResponseEntity<?> authorityError = authorityError(
                reviewerRole, reviewerDistrict, user, "reviewed");
        if (authorityError != null) {
            return authorityError;
        }

        String rejectionReason = reason == null ? "" : reason.trim();
        user.setVerificationStatus("REJECTED");
        user.setVerificationLevel("BASIC");
        user.setVerificationReviewedAt(LocalDateTime.now());
        user.setVerificationReviewedBy(reviewerUsername);
        user.setVerificationRejectionReason(rejectionReason);
        userRepository.save(user);

        String message = rejectionReason.isEmpty()
                ? "Your verification request was rejected."
                : "Your verification request was rejected: " + rejectionReason;
        notificationService.createNotification(
                username,
                message,
                "VERIFICATION_RESULT",
                reviewerUsername,
                "LCDJP Administrator",
                reviewerRole == null ? "Admin" : reviewerRole
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User " + username + " rejected",
                "status", "REJECTED"
        ));
    }

    public boolean hasDistrictAdminForDistrict(String district) {
        return verificationAuthorityService.hasDistrictAdminForDistrict(district);
    }

    private User findTarget(String username) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        return userService.findByUsername(username);
    }

    private ResponseEntity<?> authorityError(String reviewerRole,
                                              String reviewerDistrict,
                                              User target,
                                              String action) {
        ResponseEntity<?> response = verificationAuthorityService.authorityError(
                reviewerRole,
                reviewerDistrict,
                target.getRequestedRole(),
                target.getDistrict(),
                target.getVerificationSubmittedAt(),
                action
        );
        if (response != null) {
            return response;
        }

        if (!RoleAuthority.isSystemAdminRole(reviewerRole)
                && !RoleAuthority.isDistrictAdminRole(reviewerRole)
                && !"admin".equalsIgnoreCase(reviewerRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only administrators can review verification requests"));
        }
        return null;
    }
}