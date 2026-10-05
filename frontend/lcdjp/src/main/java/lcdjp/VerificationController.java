package lcdjp;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbcTemplate;

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
            List<Map<String, Object>> districtAdmins = jdbcTemplate.queryForList(
                    "SELECT username FROM users WHERE role IN ('DISTRICT_ADMIN', 'District Admin') " +
                            "AND district = ? ORDER BY username LIMIT 1",
                    district.trim());
            if (!districtAdmins.isEmpty()) {
                return String.valueOf(districtAdmins.get(0).get("username"));
            }
        }

        List<Map<String, Object>> systemAdmins = jdbcTemplate.queryForList(
                "SELECT username FROM users WHERE role IN ('Admin', 'SYSTEM_ADMIN', " +
                        "'System Administrator') ORDER BY username LIMIT 1");
        return systemAdmins.isEmpty() ? "system_admin" : String.valueOf(systemAdmins.get(0).get("username"));
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

        }

        docs.put(documentType, fileData);

        try {
            ObjectMapper mapper = new ObjectMapper();
            user.setVerificationDocuments(mapper.writeValueAsString(docs));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to save document"));
        }

        userRepository.save(user);

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
            String role = jdbcTemplate.queryForObject(
                    "SELECT role FROM users WHERE username = ?", String.class, username);
            if (role == null) return false;
            String normalized = role.trim().toUpperCase().replace(' ', '_');
            return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                    || normalized.equals("SYSTEM_ADMINISTRATOR") || normalized.equals("DISTRICT_ADMIN");
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