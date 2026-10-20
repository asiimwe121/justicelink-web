package lcdjp.admin;

import lcdjp.security.PasswordPolicy;
import lcdjp.auth.AccountCreationOtpService;
import lcdjp.security.JwtUtil;
import lcdjp.user.UserAccountRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.*;

@RestController
@RequestMapping("/api/lc")
public class LcController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LcController.class);
    @Autowired
    private UserAccountRepository userAccounts;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private AuditLogService auditLogService;
    @Autowired
    private BCryptPasswordEncoder passwordEncoder;
    @Autowired
    private AccountCreationOtpService accountCreationOtpService;

    public LcController() {
        logger.info("✅ LcController loaded successfully!");
    }

    private String strVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    /** "lc 3", "LC3", "lc-3" -> "LC3"; null when it is not LC1..LC5. */
    private static String normalizeLcLevel(String raw) {
        return LcLevelRules.normalizeLevel(raw);
    }

    /** Name of the first area the level needs but the request left blank, or null when nothing is missing. */
    private static String missingAreaFor(String level, String village, String parish, String subCounty) {
        return LcLevelRules.missingArea(level, village, parish, subCounty);
    }

    private Map<String, Object> getUserDetailsFromToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Map<String, Object> details = new HashMap<>();
                details.put("username", jwtUtil.extractUsername(token));
                details.put("role", jwtUtil.extractRole(token));
                details.put("district", jwtUtil.extractDistrict(token));
                return details;
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private String findActiveDistrictAdminUsername(String district) {
        if (district == null || district.trim().isEmpty()) return null;
        try {
            List<Map<String, Object>> rows = userAccounts.findDistrictAdmins(district.trim());
            for (Map<String, Object> row : rows) {
                boolean disabled = "disabled".equalsIgnoreCase(strVal(row.get("approval_status")));
                Object activeObj = row.get("is_active");
                boolean inactive = (activeObj instanceof Boolean) && !((Boolean) activeObj);
                if (!disabled && !inactive) {
                    return strVal(row.get("username"));
                }
            }
            return null;
        } catch (Exception e) {
            logger.error("⚠️ Could not check active district admins: " + e.getMessage());
            return null;
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createLcAccount(@Valid @RequestBody CreateLcAccountRequest request,
                                              HttpServletRequest httpRequest) {
        try {
            Map<String, Object> caller = getUserDetailsFromToken(httpRequest);
            if (caller == null || strVal(caller.get("username")).isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "error", "Invalid or missing authentication token"));
            }

            String actor = strVal(caller.get("username"));
            String actorRole = strVal(caller.get("role"));
            String actorDistrict = strVal(caller.get("district"));
            String normalizedRole = actorRole.toUpperCase().replace(' ', '_');

            boolean isSystemAdmin = normalizedRole.equals("SYSTEM_ADMIN") || normalizedRole.equals("ADMIN")
                    || normalizedRole.equals("SYSTEM_ADMINISTRATOR");
            boolean isDistrictAdmin = normalizedRole.equals("DISTRICT_ADMIN") || normalizedRole.equals("DISTRICT_ADMINISTRATOR");

            if (!isSystemAdmin && !isDistrictAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false,
                                "error", "Only District Admins or System Administrators can create LC accounts. Your role: " + actorRole));
            }

            String username  = request.getUsername() == null ? "" : request.getUsername();
            String password  = request.getPassword() == null ? "" : request.getPassword();
            String firstName = request.getFirstName() == null ? "" : request.getFirstName();
            String lastName  = request.getLastName() == null ? "" : request.getLastName();
            String email     = request.getEmail() == null ? "" : request.getEmail();
            String phone     = request.getPhone() == null ? "" : request.getPhone();
            String district  = request.getDistrict() == null ? "" : request.getDistrict();
            String village   = request.getVillage() == null ? "" : request.getVillage().trim();
            String parish    = request.getParish() == null ? "" : request.getParish().trim();
            String subCounty = request.getSubCounty() == null ? "" : request.getSubCounty().trim();
            String lcLevel   = normalizeLcLevel(request.getLcLevel());
            String createdBy = request.getCreatedBy() == null ? "" : request.getCreatedBy();
            String fallbackReason = request.getFallbackReason() == null ? "" : request.getFallbackReason();

            if (username.isEmpty() || password.isEmpty() || firstName.isEmpty() || lastName.isEmpty()
                    || email.isEmpty() || phone.isEmpty() || district.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "error", "All fields are required"));
            }
            if (lcLevel == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "error", "LC level is required and must be one of LC1, LC2, LC3, LC4 or LC5"));
            }
            String missingArea = missingAreaFor(lcLevel, village, parish, subCounty);
            if (missingArea != null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "error", lcLevel + " accounts need the " + missingArea));
            }
            // Areas below the chosen level do not apply to it (an LC3 has no village), so they are not stored.
            if (lcLevel.equals("LC2") || lcLevel.equals("LC3") || lcLevel.equals("LC4") || lcLevel.equals("LC5")) village = "";
            if (lcLevel.equals("LC3") || lcLevel.equals("LC4") || lcLevel.equals("LC5")) parish = "";
            if (lcLevel.equals("LC4") || lcLevel.equals("LC5")) subCounty = "";
            if (PasswordPolicy.tooShort(password)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "error", PasswordPolicy.message()));
            }

            if (!accountCreationOtpService.isVerified(httpRequest, "LC", email, phone)) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                        .body(Map.of("success", false, "error",
                                "Please verify this email/phone with a one-time code before creating the account"));
            }

            if (isDistrictAdmin) {
                if (actorDistrict.isEmpty() || !actorDistrict.equalsIgnoreCase(district)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("success", false,
                                    "error", "You may only create LC accounts for your own district (" +
                                            (actorDistrict.isEmpty() ? "none assigned" : actorDistrict) + ")"));
                }
            } else {
                String existingAdmin = findActiveDistrictAdminUsername(district);
                if (existingAdmin != null) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("success", false, "error",
                                    "District Admin \"@" + existingAdmin + "\" already manages " + district +
                                            ". LC accounts for this district must be created by them."));
                }
            }

            Integer existingUser = userAccounts.countByUsername(username);
            if (existingUser != null && existingUser > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("success", false, "error", "Username already exists"));
            }

            userAccounts.insertLcAccount(
                    username, passwordEncoder.encode(password), firstName, lastName,
                    email, phone, district, village.isEmpty() ? null : village,
                    parish.isEmpty() ? null : parish, subCounty.isEmpty() ? null : subCounty, lcLevel,
                    createdBy.isEmpty() ? null : createdBy,
                    fallbackReason.isEmpty() ? null : fallbackReason);

            accountCreationOtpService.consume(httpRequest);

            auditLogService.logAction(
                    actor,
                    actorRole,
                    "LC_ACCOUNT_CREATED",
                    "user",
                    username,
                    "LC account (" + lcLevel + ") created for district: " + district
                            + (subCounty.isEmpty() ? "" : ", sub-county: " + subCounty)
                            + (parish.isEmpty() ? "" : ", parish: " + parish)
                            + (village.isEmpty() ? "" : ", village: " + village)
                            + (createdBy.isEmpty() ? "" : " [via " + createdBy + ": " + fallbackReason + "]")
            );

            logger.info("✅ LC account created: " + username + " for district: " + district);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "username", username,
                    "district", district,
                    "lcLevel", lcLevel
            ));

        } catch (Exception e) {
            logger.error("❌ Error creating LC account: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "Request could not be processed. Please try again later."));
        }
    }
}
