package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class ProfileController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(ProfileController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private PhoneUtil phoneUtil;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("username") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String username = (String) session.getAttribute("username");

        try {
            String sql = "SELECT user_id, username, first_name, last_name, email, phone, role, " +
                    "district, sub_county, parish, village, national_id, gender, date_of_birth, " +
                    "user_type, approval_status, created_at, " +
                    "verification_status, verification_submitted_at, verification_reviewed_at, " +
                    "verification_reviewed_by, verification_rejection_reason " +
                    "FROM users WHERE username = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);

            if (results.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            Map<String, Object> profile = results.get(0);

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
            StringBuilder sql = new StringBuilder("UPDATE users SET ");
            List<Object> params = new ArrayList<>();
            boolean hasFields = false;

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
                sql.append("phone = ?, ");
                params.add(profileData.get("phone"));
                hasFields = true;
            }
            if (profileData.containsKey("email") && profileData.get("email") != null) {
                String newEmail = String.valueOf(profileData.get("email")).trim();
                if (!newEmail.isEmpty()) {
                    Integer emailCount = jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER(?) AND username <> ?",
                            Integer.class, newEmail, username);
                    if (emailCount != null && emailCount > 0) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(Map.of("error", "This email is already registered to another account"));
                    }
                }
                sql.append("email = ?, ");
                params.add(profileData.get("email"));
                hasFields = true;
            }
            if (profileData.containsKey("district") && profileData.get("district") != null) {
                sql.append("district = ?, ");
                params.add(profileData.get("district"));
                hasFields = true;
            }
            if (profileData.containsKey("subCounty") && profileData.get("subCounty") != null) {
                sql.append("sub_county = ?, ");
                params.add(profileData.get("subCounty"));
                hasFields = true;
            }
            if (profileData.containsKey("parish") && profileData.get("parish") != null) {
                sql.append("parish = ?, ");
                params.add(profileData.get("parish"));
                hasFields = true;
            }
            if (profileData.containsKey("village") && profileData.get("village") != null) {
                sql.append("village = ?, ");
                params.add(profileData.get("village"));
                hasFields = true;
            }
            if (profileData.containsKey("avatarData") && profileData.get("avatarData") != null) {
                String newAvatar = String.valueOf(profileData.get("avatarData"));
                if (newAvatar.length() > 3_000_000) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Profile picture is too large. Please choose an image under 2MB."));
                }
                sql.append("avatar_data = ?, ");
                params.add(newAvatar);
                hasFields = true;
            }

            if (!hasFields) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No fields to update"));
            }

            String query = sql.toString();
            query = query.substring(0, query.length() - 2);
            query += " WHERE username = ?";
            params.add(username);

            int updated = jdbcTemplate.update(query, params.toArray());

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
