package lcdjp.verification;

import lcdjp.common.ApiErrors;
import lcdjp.storage.FileRefService;
import lcdjp.notification.NotificationService;
import lcdjp.security.RoleAuthority;
import lcdjp.user.User;
import lcdjp.user.UserAccountRepository;
import lcdjp.user.UserRepository;
import lcdjp.user.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final UserAccountRepository userAccounts;

    /** Optional and not part of the constructor: when null (or storage is off) files stay in MySQL as before. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private FileRefService fileRefService;

    @PostMapping("/request")
    public ResponseEntity<?> requestVerification(@RequestParam String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;

        User user = userService.findByUsername(username);

        if ("VERIFIED".equals(user.getVerificationStatus())) {
            return ResponseEntity.ok(Map.of("message", "Already verified"));
        }

        user.setVerificationStatus("PENDING");
        user.setVerificationSubmittedAt(LocalDateTime.now());
        userRepository.save(user);

        notificationService.createNotification(
                resolveVerificationRecipient(user.getDistrict()),
                "User " + username + " requested verification",
                "VERIFICATION_REQUEST",
                "system", "System", "System"
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Verification request submitted"
        ));
    }

    private String resolveVerificationRecipient(String district) {
        if (district != null && !district.trim().isEmpty()) {
            String districtAdmin = userAccounts.findVerificationDistrictAdmin(district.trim());
            if (districtAdmin != null) {
                return districtAdmin;
            }
        }
        String systemAdmin = userAccounts.findSystemAdminUsername();
        return systemAdmin != null ? systemAdmin : "system_admin";
    }

    @GetMapping("/status/{username}")
    public ResponseEntity<?> getVerificationStatus(@PathVariable String username) {
        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;

        User user = userService.findByUsername(username);
        return ResponseEntity.ok(Map.of(
                "status", user.getVerificationStatus(),
                "level", user.getVerificationLevel()
        ));
    }

    @PostMapping("/upload-document")
    public ResponseEntity<?> uploadDocument(
            @RequestParam String username,
            @RequestParam String documentType,
            @RequestParam String fileData) {

        ResponseEntity<?> denied = requireActor(username);
        if (denied != null) return denied;

        User user = userService.findByUsername(username);

        Map<String, String> docs = new HashMap<>();
        try {
            ObjectMapper mapper = new ObjectMapper();
            if (user.getVerificationDocuments() != null && !user.getVerificationDocuments().isEmpty()) {
                docs = mapper.readValue(user.getVerificationDocuments(), Map.class);
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(VerificationController.class)
                    .warn("Existing verification documents for {} could not be read; starting from an empty set", username, e);
        }

        String storedData = fileRefService == null ? fileData : fileRefService.externalizeIfDataUri(fileData, "users");
        String replaced = docs.put(documentType, storedData);

        try {
            ObjectMapper mapper = new ObjectMapper();
            user.setVerificationDocuments(mapper.writeValueAsString(docs));
        } catch (Exception e) {
            return ApiErrors.serverError(VerificationController.class, e, "Failed to save document");
        }

        userRepository.save(user);

        if (fileRefService != null && replaced != null && !replaced.equals(storedData)) {
            fileRefService.deleteQuietly(replaced); // the earlier file of this type is no longer referenced
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document uploaded"
        ));
    }

    private String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (authentication != null && authentication.isAuthenticated())
                ? authentication.getName() : null;
    }

    private boolean isAdministrator(String username) {
        try {
            String role = userAccounts.findRole(username);
            return RoleAuthority.isAdministratorRole(role);
        } catch (Exception e) {
            return false;
        }
    }

    private ResponseEntity<?> requireActor(String targetUsername) {
        String actor = authenticatedUsername();
        if (actor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        if (!actor.equals(targetUsername) && !isAdministrator(actor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You may only manage your own verification"));
        }
        return null;
    }
}