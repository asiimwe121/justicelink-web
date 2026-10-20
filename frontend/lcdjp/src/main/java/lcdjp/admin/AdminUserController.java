package lcdjp.admin;

import lcdjp.storage.FileRefService;
import lcdjp.notification.NotificationDispatcher;
import lcdjp.user.PhoneUtil;
import lcdjp.security.RequestIdentity;
import lcdjp.security.RoleAuthority;
import lcdjp.storage.StoredFileCleanupService;
import lcdjp.verification.VerificationDecisionRequest;
import lcdjp.verification.VerificationDecisionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AdminUserController {

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(AdminUserController.class);

    private static final int USERS_MAX_PAGE_SIZE = 500;
    private static final int USERS_DEFAULT_PAGE_SIZE = 25;

    @Autowired
    private AdminUserRepository adminUsers;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private NotificationDispatcher notificationDispatcher;

    @Autowired
    private PhoneUtil phoneUtil;

    @Autowired
    private RequestIdentity requestIdentity;

    @Autowired
    private VerificationDecisionService verificationDecisionService;

    /** Optional: when null (or object storage is off) files stay in MySQL exactly as before. */
    @Autowired(required = false)
    private FileRefService fileRefService;

    @Autowired(required = false)
    private StoredFileCleanupService fileCleanup;


    private boolean hasDistrictAdminForDistrict(String district) {
        return verificationDecisionService.hasDistrictAdminForDistrict(district);
    }

    private Set<String> fetchDistrictsWithAdmin() {
        List<String> districts = adminUsers.findDistrictsWithAdmin();
        return new HashSet<>(districts);
    }

    private boolean districtHasAdmin(Set<String> districtsWithAdmin, String district) {
        return district != null && !district.trim().isEmpty()
                && districtsWithAdmin.contains(district.trim().toLowerCase());
    }

    private boolean districtMatches(String requestedDistrict, String assignedDistrict) {
        return requestedDistrict != null
                && assignedDistrict != null
                && !requestedDistrict.trim().isEmpty()
                && !assignedDistrict.trim().isEmpty()
                && requestedDistrict.trim().equalsIgnoreCase(assignedDistrict.trim());
    }

    private ResponseEntity<?> requireAdministrator(HttpServletRequest request) {
        if (request == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }
        String username = requestIdentity.resolveUsername(request);
        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }
        String role = requestIdentity.resolveRole(request, username);
        if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only administrators can view user details"));
        }
        return null;
    }

    private ResponseEntity<?> requireAdministratorForUser(HttpServletRequest request, String targetUsername) {
        ResponseEntity<?> base = requireAdministrator(request);
        if (base != null) return base;

        String adminUsername = requestIdentity.resolveUsername(request);
        String role = requestIdentity.resolveRole(request, adminUsername);
        if (RoleAuthority.isSystemAdminRole(role)) return null;

        String targetDistrict;
        try {
            targetDistrict = adminUsers.findDistrict(targetUsername);
        } catch (Exception e) {
            targetDistrict = null;
        }
        if (!districtMatches(targetDistrict, requestIdentity.resolveDistrict(request, adminUsername))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "District Admins can only view documents for users in their assigned district."));
        }
        return null;
    }

    private ResponseEntity<?> requireAdministratorForUserModification(HttpServletRequest request, String targetUsername) {
        ResponseEntity<?> base = requireAdministrator(request);
        if (base != null) return base;

        String adminUsername = requestIdentity.resolveUsername(request);
        String role = requestIdentity.resolveRole(request, adminUsername);

        Map<String, Object> targetRow;
        try {
            targetRow = adminUsers.findDistrictRoleAndSubmittedAt(targetUsername);
        } catch (Exception e) {
            targetRow = null;
        }
        String targetDistrict = targetRow != null && targetRow.get("district") != null
                ? targetRow.get("district").toString() : null;
        String targetRole = targetRow != null && targetRow.get("role") != null
                ? targetRow.get("role").toString() : null;
        LocalDateTime targetSubmittedAt = targetRow != null
                && targetRow.get("verification_submitted_at") instanceof LocalDateTime
                ? (LocalDateTime) targetRow.get("verification_submitted_at") : null;
        boolean overdue = targetSubmittedAt != null
                && targetSubmittedAt.isBefore(LocalDateTime.now().minusHours(24));

        if (RoleAuthority.isSystemAdminRole(role)) {
            boolean targetIsAdminAccount = RoleAuthority.isDistrictAdminRole(targetRole)
                    || RoleAuthority.isSystemAdminRole(targetRole);
            if (!targetIsAdminAccount && hasDistrictAdminForDistrict(targetDistrict) && !overdue) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "error", "This account's district has an assigned District Admin, who has exclusive " +
                                "authority to verify, edit, or deactivate it (the System Admin can also step in " +
                                "once 24 hours have passed since the account's verification request)."));
            }
            return null;
        }

        if (!districtMatches(targetDistrict, requestIdentity.resolveDistrict(request, adminUsername))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "District Admins can only manage users in their assigned district."));
        }
        return null;
    }

    private ResponseEntity<?> requireUserOrAdministrator(HttpServletRequest request, String targetUsername) {
        String authenticatedUsername = requestIdentity.resolveUsername(request);
        if (authenticatedUsername == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String role = requestIdentity.resolveRole(request, authenticatedUsername);
        if (authenticatedUsername.equalsIgnoreCase(targetUsername)
                || RoleAuthority.isSystemAdminRole(role)
                || RoleAuthority.isDistrictAdminRole(role)) {
            return null;
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Only administrators may view another user's details"));
    }

    private String databaseText(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Clob) {
            try {
                java.sql.Clob clob = (java.sql.Clob) value;
                return clob.getSubString(1, (int) clob.length());
            } catch (Exception e) {
                logger.warn("could not read a CLOB column: {}", e.toString());
                return null;
            }
        }
        return value.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseVerificationDocuments(Object raw) {
        String json = databaseText(raw);
        if (json == null || json.isBlank()) return Map.of();
        try {
            Map<String, Object> parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(json, Map.class);
            Map<String, Object> result = new HashMap<>();
            parsed.forEach((key, value) -> {
                if (key.startsWith("roleDoc_") || key.equals("selfie")
                        || key.equals("nationalId")) {
                    result.put(key, value);
                }
            });
            return result;
        } catch (Exception e) {
            return Map.of();
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(HttpServletRequest request,
                                          @RequestParam(required = false) Integer page,
                                          @RequestParam(required = false) Integer pageSize) {
        String loggedInUser = requestIdentity.resolveUsername(request);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String role = requestIdentity.resolveRole(request, loggedInUser);
        String district = requestIdentity.resolveDistrict(request, loggedInUser);

        boolean paginated = page != null || pageSize != null;
        int resolvedPage = (page == null || page < 1) ? 1 : page;
        int resolvedPageSize = (pageSize == null || pageSize < 1)
                ? USERS_DEFAULT_PAGE_SIZE
                : Math.min(pageSize, USERS_MAX_PAGE_SIZE);
        int offset = (resolvedPage - 1) * resolvedPageSize;

        try {
            if (RoleAuthority.isSystemAdminRole(role)) {

                List<Map<String, Object>> userList;
                Long totalCount = null;
                if (paginated) {
                    totalCount = adminUsers.countAllUsers();
                    userList = adminUsers.listAllUsersPage(resolvedPageSize, offset);
                } else {
                    userList = adminUsers.listAllUsers();
                }

                Set<String> districtsWithAdmin = fetchDistrictsWithAdmin();
                for (Map<String, Object> row : userList) {
                    Object rowDistrict = row.get("district");
                    row.put("districtAdminAssigned",
                            districtHasAdmin(districtsWithAdmin, rowDistrict == null ? "" : rowDistrict.toString()));
                }
                logger.info("System Admin retrieved {} users", userList.size());
                Map<String, Object> body = new HashMap<>();
                body.put("success", true);
                body.put("users", userList);
                if (paginated) {
                    body.put("page", resolvedPage);
                    body.put("pageSize", resolvedPageSize);
                    body.put("totalCount", totalCount);
                }
                return ResponseEntity.ok(body);

            } else if (RoleAuthority.isDistrictAdminRole(role)) {

                if (district == null || district.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }

                List<Map<String, Object>> userList;
                Long totalCount = null;
                if (paginated) {
                    totalCount = adminUsers.countUsersInDistrict(district);
                    userList = adminUsers.listUsersInDistrictPage(district, resolvedPageSize, offset);
                } else {
                    userList = adminUsers.listUsersInDistrict(district);
                }
                logger.info("District Admin ({}) retrieved {} users", district, userList.size());
                Map<String, Object> body = new HashMap<>();
                body.put("success", true);
                body.put("users", userList);
                if (paginated) {
                    body.put("page", resolvedPage);
                    body.put("pageSize", resolvedPageSize);
                    body.put("totalCount", totalCount);
                }
                return ResponseEntity.ok(body);

            } else {

                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access Denied. Insufficient permissions to view user list."));
            }

        } catch (Exception e) {
            logger.error("Error fetching users", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @GetMapping("/admin/verification-requests")
    public ResponseEntity<?> getPendingVerifications(HttpServletRequest request) {
        try {

            String loggedInUser = requestIdentity.resolveUsername(request);
            if (loggedInUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            String role = requestIdentity.resolveRole(request, loggedInUser);
            String district = requestIdentity.resolveDistrict(request, loggedInUser);
            if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators can view verification requests"));
            }

            List<Map<String, Object>> pendingUsers;
            if (RoleAuthority.isDistrictAdminRole(role)) {
                if (district == null || district.trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
                pendingUsers = adminUsers.findPendingVerificationSummaries(district.trim());
            } else {
                pendingUsers = adminUsers.findPendingVerificationSummaries(null);
            }

            Set<String> districtsWithAdmin = fetchDistrictsWithAdmin();
            for (Map<String, Object> pendingUser : pendingUsers) {
                Object pendingDistrict = pendingUser.get("district");
                pendingUser.put("districtAdminAssigned",
                        districtHasAdmin(districtsWithAdmin, pendingDistrict == null ? "" : pendingDistrict.toString()));
            }

            logger.info("📋 Found " + pendingUsers.size() + " pending verification requests.");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "users", pendingUsers,
                    "count", pendingUsers.size()
            ));

        } catch (Exception e) {
            logger.error("❌ Error fetching verification requests: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/users/pending")
    public ResponseEntity<?> getPendingUsers(HttpServletRequest request) {
        try {
            String loggedInUser = requestIdentity.resolveUsername(request);
            if (loggedInUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            String role = requestIdentity.resolveRole(request, loggedInUser);
            String district = requestIdentity.resolveDistrict(request, loggedInUser);
            if (!RoleAuthority.isSystemAdminRole(role) && !RoleAuthority.isDistrictAdminRole(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators can view verification requests"));
            }

            List<Map<String, Object>> pendingUsers;
            if (RoleAuthority.isDistrictAdminRole(role)) {
                if (district == null || district.trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
                pendingUsers = adminUsers.findPendingApprovals(district.trim());
            } else {
                pendingUsers = adminUsers.findPendingApprovals(null);
            }

            Set<String> districtsWithAdmin = fetchDistrictsWithAdmin();
            for (Map<String, Object> pendingUser : pendingUsers) {
                Object pendingDistrict = pendingUser.get("district");
                pendingUser.put("districtAdminAssigned",
                        districtHasAdmin(districtsWithAdmin, pendingDistrict == null ? "" : pendingDistrict.toString()));
            }

            logger.info("📋 Found " + pendingUsers.size() + " pending verification requests");
            return ResponseEntity.ok(Map.of("success", true, "users", pendingUsers));
        } catch (Exception e) {
            logger.error("❌ Error fetching pending users: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/users/{username}")
    public ResponseEntity<?> getUserByUsername(@PathVariable String username,
                                               HttpServletRequest request) {
        try {
            ResponseEntity<?> denied = requireUserOrAdministrator(request, username);
            if (denied != null) return denied;

            if (!adminUsers.userExists(username)) {
                logger.info("ℹ️ User not found: " + username);

                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found");
                response.put("user", null);
                response.put("deleted", true);
                return ResponseEntity.ok(response);
            }

            List<Map<String, Object>> results = adminUsers.findAllColumns(username);

            if (results.isEmpty()) {
                logger.info("ℹ️ User not found: " + username);
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found");
                response.put("user", null);
                response.put("deleted", true);
                return ResponseEntity.ok(response);
            }

            Map<String, Object> user = results.get(0);
            Map<String, Object> submittedDocuments =
                    parseVerificationDocuments(user.get("verification_documents"));
            user.putAll(submittedDocuments);
            user.put("districtAdminAssigned",
                    hasDistrictAdminForDistrict(user.get("district") == null ? "" : user.get("district").toString()));

            user.put("avatarData", user.get("avatar_data"));

            user.put("hasDocuments", Map.of(
                    "idFront", user.get("id_front") != null,
                    "idBack", user.get("id_back") != null,
                    "lawyerWorkId", user.get("lawyer_work_id") != null,
                    "lawyerCertificate", user.get("lawyer_certificate") != null,
                    "lawyerCV", user.get("lawyer_cv_data") != null,
                    "lcAppointmentLetter", user.get("lc_appointment_letter") != null,
                    "lcOfficialId", user.get("lc_official_id") != null,
                    "selfie", user.get("selfie") != null,
                    "nationalId", user.get("national_id") != null
                            || user.get("nationalId") != null
                            || submittedDocuments.get("nationalId") != null,
                    "roleDocuments", !submittedDocuments.isEmpty()
            ));

            user.remove("id_front");
            user.remove("id_back");
            user.remove("lawyer_work_id");
            user.remove("lawyer_certificate");
            user.remove("lawyer_cv_data");
            user.remove("lawyer_cv_name");
            user.remove("lawyer_cv_size");
            user.remove("lawyer_cv_type");
            user.remove("lc_appointment_letter");
            user.remove("lc_official_id");
            user.remove("verification_documents");
            user.remove("password_hash");
            user.remove("password");

            logger.info("✅ User found: " + username);

            return ResponseEntity.ok(Map.of("success", true, "user", user));
        } catch (Exception e) {
            logger.error("❌ Error fetching user: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @GetMapping("/users/{username}/documents")
    public ResponseEntity<?> getUserDocuments(@PathVariable String username,
                                              HttpServletRequest request) {
        try {
            ResponseEntity<?> denied = requireAdministratorForUser(request, username);
            if (denied != null) return denied;

            List<Map<String, Object>> results = adminUsers.findVerificationDocuments(username);

            if (results.isEmpty()) {
                logger.info("❌ User not found: " + username);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            Map<String, Object> user = results.get(0);

            Map<String, Object> documents = new HashMap<>();
            documents.put("idFront", user.get("id_front"));
            documents.put("idBack", user.get("id_back"));
            documents.put("lawyerWorkId", user.get("lawyer_work_id"));
            documents.put("lawyerCertificate", user.get("lawyer_certificate"));
            documents.put("lawyerCVData", user.get("lawyer_cv_data"));
            documents.put("lawyerCVName", user.get("lawyer_cv_name"));
            documents.put("lawyerCVSize", user.get("lawyer_cv_size"));
            documents.put("lawyerCVType", user.get("lawyer_cv_type"));
            documents.put("lcAppointmentLetter", user.get("lc_appointment_letter"));
            documents.put("lcOfficialId", user.get("lc_official_id"));
            documents.putAll(parseVerificationDocuments(user.get("verification_documents")));
            if (fileRefService != null) {
                // The admin preview reads inline data, so bring files kept in the bucket back in that form.
                for (Map.Entry<String, Object> doc : documents.entrySet()) {
                    if (doc.getValue() instanceof String s && s.startsWith(FileRefService.REF_PREFIX)) {
                        doc.setValue(fileRefService.inlineAsDataUri(s));
                    }
                }
            }

            String documentsJson = databaseText(user.get("documents"));
            if (documentsJson != null && !documentsJson.isEmpty()) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Map<String, Object> metadata = mapper.readValue(documentsJson, Map.class);
                    documents.put("metadata", metadata);
                } catch (Exception e) {
                    documents.put("metadata", Map.of());
                }
            } else {
                documents.put("metadata", Map.of());
            }

            logger.info("📄 Documents retrieved for: " + username);

            return ResponseEntity.ok(Map.of("success", true, "documents", documents));

        } catch (Exception e) {
            logger.error("❌ Error fetching documents: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @PutMapping("/users/{username}/approve")
    public ResponseEntity<?> approveUser(@PathVariable String username, HttpServletRequest request) {
        try {

            ResponseEntity<?> denied = requireAdministratorForUserModification(request, username);
            if (denied != null) return denied;

            int updated = adminUsers.approve(username);

            if (updated > 0) {

                List<Map<String, Object>> userResults = adminUsers.findEmailAndFirstName(username);

                if (!userResults.isEmpty()) {
                    Map<String, Object> user = userResults.get(0);
                    String email = (String) user.get("email");
                    String firstName = (String) user.get("first_name");

                    if (email != null && !email.isEmpty()) {
                        String emailBody = "<h1>Account Approved</h1>"
                                + "<p>Hi " + firstName + ",</p>"
                                + "<p>Your account has been approved by the administrator.</p>"
                                + "<p>You can now login to the system.</p>"
                                + "<p>Best regards,<br>JusticeLink Team</p>";

                        // Queued after the approval is saved; a mail failure no longer turns a committed approval into a 500.
                        notificationDispatcher.sendEmail(email, "Account Approved", emailBody);
                    }
                }

                logger.info("✅ User approved: " + username);
                auditLogService.logAction(username, "Admin", "USER_APPROVED", "user", username, "User approved by admin");
                return ResponseEntity.ok(Map.of("success", true, "message", "User approved"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        } catch (Exception e) {
            logger.error("❌ Error approving user: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @PutMapping("/users/{username}/reject")
    public ResponseEntity<?> rejectUser(@PathVariable String username, HttpServletRequest request) {
        try {

            ResponseEntity<?> denied = requireAdministratorForUserModification(request, username);
            if (denied != null) return denied;

            int updated = adminUsers.reject(username);
            if (updated > 0) {
                logger.info("❌ User rejected: " + username);
                auditLogService.logAction(
                        username,
                        "Admin",
                        "USER_REJECTED",
                        "user",
                        username,
                        "User rejected by admin"
                );
                return ResponseEntity.ok(Map.of("success", true, "message", "User rejected"));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"));
        } catch (Exception e) {
            logger.error("❌ Error rejecting user: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error. Please try again later."));
        }
    }

    @PutMapping("/users/{username}")
    public ResponseEntity<?> updateUser(@PathVariable String username,
                                        @Valid @RequestBody AdminUserUpdateRequest userData,
                                        HttpServletRequest request) {
        try {

            ResponseEntity<?> denied = requireAdministratorForUserModification(request, username);
            if (denied != null) return denied;

            if (!adminUsers.userExists(username)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            Map<String, Object> columns = new java.util.LinkedHashMap<>();
            boolean hasFields = false;
            boolean deactivating = false;

            if (userData.containsKey("firstName") && userData.get("firstName") != null) {
                columns.put("first_name", userData.get("firstName"));
                hasFields = true;
            }
            if (userData.containsKey("lastName") && userData.get("lastName") != null) {
                columns.put("last_name", userData.get("lastName"));
                hasFields = true;
            }
            if (userData.containsKey("phone") && userData.get("phone") != null) {
                String newPhone = String.valueOf(userData.get("phone")).trim();
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
                columns.put("phone", userData.get("phone"));
                hasFields = true;
            }
            if (userData.containsKey("email") && userData.get("email") != null) {
                String newEmail = String.valueOf(userData.get("email")).trim();
                if (!newEmail.isEmpty()) {
                    if (adminUsers.emailUsedByAnotherUser(newEmail, username)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(Map.of("error", "This email is already registered to another account"));
                    }
                }
                columns.put("email", userData.get("email"));
                hasFields = true;
            }
            if (userData.containsKey("district") && userData.get("district") != null) {
                columns.put("district", userData.get("district"));
                hasFields = true;
            }
            if (userData.containsKey("subCounty") && userData.get("subCounty") != null) {
                columns.put("sub_county", userData.get("subCounty"));
                hasFields = true;
            }
            if (userData.containsKey("parish") && userData.get("parish") != null) {
                columns.put("parish", userData.get("parish"));
                hasFields = true;
            }
            if (userData.containsKey("village") && userData.get("village") != null) {
                columns.put("village", userData.get("village"));
                hasFields = true;
            }
            if (userData.containsKey("nationalId") && userData.get("nationalId") != null) {
                columns.put("national_id", userData.get("nationalId"));
                hasFields = true;
            }
            if (userData.containsKey("gender") && userData.get("gender") != null) {
                columns.put("gender", userData.get("gender"));
                hasFields = true;
            }
            if (userData.containsKey("dateOfBirth") && userData.get("dateOfBirth") != null) {
                columns.put("date_of_birth", userData.get("dateOfBirth"));
                hasFields = true;
            }
            if (userData.containsKey("approvalStatus") && userData.get("approvalStatus") != null) {
                String newStatus = String.valueOf(userData.get("approvalStatus")).trim();
                deactivating = "Disabled".equalsIgnoreCase(newStatus);
                if (deactivating) {
                    if ("system_admin".equals(username)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "System Administrator account cannot be deactivated"));
                    }
                    if (username.equals(requestIdentity.resolveUsername(request))) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You cannot deactivate your own account"));
                    }
                }
                columns.put("approval_status", userData.get("approvalStatus"));
                if (deactivating) {
                    columns.put("is_active", false);
                } else {
                    columns.put("is_active", true);
                }
                hasFields = true;
            }
            if (userData.containsKey("userType") && userData.get("userType") != null) {
                columns.put("user_type", userData.get("userType"));
                hasFields = true;
            }
            if (userData.containsKey("lawyerSpecialization") && userData.get("lawyerSpecialization") != null) {
                columns.put("lawyer_specialization", userData.get("lawyerSpecialization"));
                hasFields = true;
            }
            if (userData.containsKey("lawFirmName") && userData.get("lawFirmName") != null) {
                columns.put("law_firm_name", userData.get("lawFirmName"));
                hasFields = true;
            }
            if (userData.containsKey("lawSchool") && userData.get("lawSchool") != null) {
                columns.put("law_school", userData.get("lawSchool"));
                hasFields = true;
            }
            if (userData.containsKey("yearsExperience") && userData.get("yearsExperience") != null) {
                columns.put("years_experience", userData.get("yearsExperience"));
                hasFields = true;
            }
            if (userData.containsKey("barNumber") && userData.get("barNumber") != null) {
                columns.put("bar_number", userData.get("barNumber"));
                hasFields = true;
            }
            if (userData.containsKey("lcLevel") && userData.get("lcLevel") != null) {
                columns.put("lc_level", userData.get("lcLevel"));
                hasFields = true;
            }
            if (userData.containsKey("lcPosition") && userData.get("lcPosition") != null) {
                columns.put("lc_position", userData.get("lcPosition"));
                hasFields = true;
            }
            if (userData.containsKey("organizationName") && userData.get("organizationName") != null) {
                columns.put("organization_name", userData.get("organizationName"));
                hasFields = true;
            }
            if (userData.containsKey("organizationType") && userData.get("organizationType") != null) {
                columns.put("organization_type", userData.get("organizationType"));
                hasFields = true;
            }
            if (userData.containsKey("specialization") && userData.get("specialization") != null) {
                columns.put("specialization", userData.get("specialization"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinName") && userData.get("nextOfKinName") != null) {
                columns.put("next_of_kin_name", userData.get("nextOfKinName"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinPhone") && userData.get("nextOfKinPhone") != null) {
                columns.put("next_of_kin_phone", userData.get("nextOfKinPhone"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinEmail") && userData.get("nextOfKinEmail") != null) {
                columns.put("next_of_kin_email", userData.get("nextOfKinEmail"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinRelationship") && userData.get("nextOfKinRelationship") != null) {
                columns.put("next_of_kin_relationship", userData.get("nextOfKinRelationship"));
                hasFields = true;
            }
            if (userData.containsKey("avatarData") && userData.get("avatarData") != null) {
                String newAvatar = String.valueOf(userData.get("avatarData"));
                // A /api/files/ URL is what the API showed, not new content: leave the stored picture alone.
                if (fileRefService == null || !fileRefService.isFileUrl(newAvatar)) {
                    columns.put("avatar_data", fileRefService == null ? newAvatar
                            : fileRefService.externalizeIfDataUri(newAvatar, FileRefService.AVATAR_FOLDER));
                    hasFields = true;
                }
            }

            if (!hasFields) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No fields to update"));
            }

            logger.info("🔄 Updating user {} fields {}", username, columns.keySet());

            Set<String> filesBefore = fileCleanup == null ? Set.of() : fileCleanup.userAccountFiles(username);
            int updated = adminUsers.updateUser(username, columns);
            if (updated > 0) {
                if (fileCleanup != null) {
                    fileCleanup.deleteAfterCommit(fileCleanup.dropped(filesBefore, fileCleanup.userAccountFiles(username)));
                }
                auditLogService.logAction(
                        username,
                        "Admin",
                        deactivating ? "USER_DEACTIVATED" : "USER_UPDATED",
                        "user",
                        username,
                        deactivating
                                ? "Account deactivated by admin; it will be removed automatically after "
                                  + "6 months of remaining deactivated"
                                : "User details updated by admin"
                );
                return ResponseEntity.ok(Map.of("success", true, "message", "User updated successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to update user"));
            }

        } catch (Exception e) {
            logger.error("❌ Error updating user: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update user. Please try again later."));
        }
    }
}
