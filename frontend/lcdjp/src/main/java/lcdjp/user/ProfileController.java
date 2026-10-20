package lcdjp.user;

import lcdjp.admin.AuditLogService;
import lcdjp.storage.FileRefService;
import lcdjp.storage.StoredFileCleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class ProfileController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(ProfileController.class);

    @Autowired
    private UserAccountRepository userAccounts;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private PhoneUtil phoneUtil;

    /** Optional: when null (or object storage is off) the picture stays in MySQL exactly as before. */
    @Autowired(required = false)
    private FileRefService fileRefService;

    @Autowired(required = false)
    private StoredFileCleanupService fileCleanup;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("username") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String username = (String) session.getAttribute("username");

        try {
            Map<String, Object> profile = userAccounts.findProfile(username);

            if (profile == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            profile.put("isOrganization", session.getAttribute("isOrganization") != null);
            if (session.getAttribute("isOrganization") != null && (Boolean) session.getAttribute("isOrganization")) {
                profile.put("orgName", session.getAttribute("orgName"));
                profile.put("orgType", session.getAttribute("orgType"));
            }

            return ResponseEntity.ok(Map.of("success", true, "profile", profile));

        } catch (Exception e) {
            logger.error("❌ Profile fetch error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch profile. Please try again later."));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody ProfileUpdateRequest profileData,
                                           HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("username") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String username = (String) session.getAttribute("username");

        try {
            Map<String, Object> columns = new LinkedHashMap<>();

            if (profileData.containsKey("phone") && profileData.get("phone") != null) {
                String newPhone = String.valueOf(profileData.get("phone")).trim();
                if (!newPhone.isEmpty()) {
                    if (PhoneUtil.normalizeLast9(newPhone) == null) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("error", "Please enter a valid phone number"));
                    }
                    if (phoneUtil.isAlreadyUsed(newPhone, username)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(Map.of("error", "This phone number is already registered to another account"));
                    }
                }
                columns.put("phone", profileData.get("phone"));
            }
            if (profileData.containsKey("email") && profileData.get("email") != null) {
                String newEmail = String.valueOf(profileData.get("email")).trim();
                if (!newEmail.isEmpty()) {
                    Integer emailCount = userAccounts.countOtherUsersWithEmail(newEmail, username);
                    if (emailCount != null && emailCount > 0) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(Map.of("error", "This email is already registered to another account"));
                    }
                }
                columns.put("email", profileData.get("email"));
            }
            if (profileData.containsKey("district") && profileData.get("district") != null) {
                columns.put("district", profileData.get("district"));
            }
            if (profileData.containsKey("subCounty") && profileData.get("subCounty") != null) {
                columns.put("sub_county", profileData.get("subCounty"));
            }
            if (profileData.containsKey("parish") && profileData.get("parish") != null) {
                columns.put("parish", profileData.get("parish"));
            }
            if (profileData.containsKey("village") && profileData.get("village") != null) {
                columns.put("village", profileData.get("village"));
            }
            if (profileData.containsKey("avatarData") && profileData.get("avatarData") != null) {
                String newAvatar = String.valueOf(profileData.get("avatarData"));
                if (newAvatar.length() > 3_000_000) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Profile picture is too large. Please choose an image under 2MB."));
                }
                // A /api/files/ URL is what the API showed, not a new picture: keep the stored one.
                if (fileRefService == null) {
                    columns.put("avatar_data", newAvatar);
                } else if (!fileRefService.isFileUrl(newAvatar)) {
                    columns.put("avatar_data", fileRefService.externalizeIfDataUri(newAvatar, FileRefService.AVATAR_FOLDER));
                }
            }

            if (columns.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No fields to update"));
            }

            java.util.Set<String> filesBefore = fileCleanup != null && columns.containsKey("avatar_data")
                    ? fileCleanup.userAccountFiles(username) : java.util.Set.of();
            int updated = userAccounts.updateProfileColumns(username, columns);
            if (updated > 0 && fileCleanup != null && !filesBefore.isEmpty()) {
                fileCleanup.deleteAfterCommit(fileCleanup.dropped(filesBefore, fileCleanup.userAccountFiles(username)));
            }

            if (updated > 0) {

                if (profileData.containsKey("phone")) {
                    session.setAttribute("phone", profileData.get("phone"));
                }
                if (profileData.containsKey("district")) {
                    session.setAttribute("district", profileData.get("district"));
                }
                if (profileData.containsKey("village")) {
                    session.setAttribute("village", profileData.get("village"));
                }
                if (profileData.containsKey("parish")) {
                    session.setAttribute("parish", profileData.get("parish"));
                }
                if (profileData.containsKey("subCounty")) {
                    session.setAttribute("subCounty", profileData.get("subCounty"));
                }

                auditLogService.logAction(
                        username,
                        "User",
                        "PROFILE_UPDATED",
                        "user",
                        username,
                        "Profile updated"
                );

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Profile updated successfully"
                ));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update profile"));

        } catch (Exception e) {
            logger.error("❌ Profile update error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update profile. Please try again later."));
        }
    }
}
