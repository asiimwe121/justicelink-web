package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PhoneUtil phoneUtil;

    @Autowired
    private RequestIdentity requestIdentity;

    @Autowired
    private VerificationDecisionService verificationDecisionService;


    private boolean hasDistrictAdminForDistrict(String district) {
        return verificationDecisionService.hasDistrictAdminForDistrict(district);
    }

    private Set<String> fetchDistrictsWithAdmin() {
        List<String> districts = jdbcTemplate.queryForList(
                "SELECT DISTINCT LOWER(TRIM(district)) FROM users " +
                        "WHERE LOWER(TRIM(role)) IN " +
                        "('district_admin', 'district admin', 'district administrator') " +
                        "AND district IS NOT NULL AND TRIM(district) <> ''",
                String.class);
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
            targetDistrict = jdbcTemplate.queryForObject(
                    "SELECT district FROM users WHERE username = ?", String.class, targetUsername);
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
            targetRow = jdbcTemplate.queryForMap(
                    "SELECT district, role, verification_submitted_at FROM users WHERE username = ?", targetUsername);
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
            } catch (Exception ignored) {
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

        String columns = "user_id, first_name, last_name, username, email, phone, role, district, " +
                "lawyer_specialization, approval_status, verification_status, created_at, user_type, requested_role";

        boolean paginated = page != null || pageSize != null;
        int resolvedPage = (page == null || page < 1) ? 1 : page;
        int resolvedPageSize = (pageSize == null || pageSize < 1)
                ? USERS_DEFAULT_PAGE_SIZE
                : Math.min(pageSize, USERS_MAX_PAGE_SIZE);
        int offset = (resolvedPage - 1) * resolvedPageSize;

        try {
            if (RoleAuthority.isSystemAdminRole(role)) {

                String baseSql = "SELECT " + columns + " FROM users WHERE username != 'system_admin'";
                List<Map<String, Object>> userList;
                Long totalCount = null;
                if (paginated) {
                    totalCount = jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM users WHERE username != 'system_admin'", Long.class);
                    userList = jdbcTemplate.queryForList(baseSql + " LIMIT ? OFFSET ?",
                            resolvedPageSize, offset);
                } else {
                    userList = jdbcTemplate.queryForList(baseSql);
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

                String baseSql = "SELECT " + columns + " FROM users WHERE district = ? AND username != 'system_admin'";
                List<Map<String, Object>> userList;
                Long totalCount = null;
                if (paginated) {
                    totalCount = jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM users WHERE district = ? AND username != 'system_admin'",
                            Long.class, district);
                    userList = jdbcTemplate.queryForList(baseSql + " LIMIT ? OFFSET ?",
                            district, resolvedPageSize, offset);
                } else {
                    userList = jdbcTemplate.queryForList(baseSql, district);
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

            String sql = "SELECT username, first_name, last_name, email, phone, district, " +
                    "verification_submitted_at, verification_status, requested_role " +
                    "FROM users WHERE verification_status = 'PENDING'";
            List<Map<String, Object>> pendingUsers;
            if (RoleAuthority.isDistrictAdminRole(role)) {
                if (district == null || district.trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
                pendingUsers = jdbcTemplate.queryForList(
                        sql + " AND LOWER(TRIM(district)) = LOWER(TRIM(?))", district.trim());
            } else {
                pendingUsers = jdbcTemplate.queryForList(sql);
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

            String sql = "SELECT user_id, first_name, last_name, username, email, phone, role, district, " +
                    "lawyer_specialization, approval_status, verification_status, created_at, user_type, requested_role " +
                    "FROM users WHERE verification_status = 'PENDING'";
            List<Map<String, Object>> pendingUsers;
            if (RoleAuthority.isDistrictAdminRole(role)) {
                if (district == null || district.trim().isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
                pendingUsers = jdbcTemplate.queryForList(
                        sql + " AND LOWER(TRIM(district)) = LOWER(TRIM(?))", district.trim());
            } else {
                pendingUsers = jdbcTemplate.queryForList(sql);
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

            String checkSql = "SELECT COUNT(*) FROM users WHERE username = ?";
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, username);

            if (count == null || count == 0) {
                logger.info("ℹ️ User not found: " + username);

                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found");
                response.put("user", null);
                response.put("deleted", true);
                return ResponseEntity.ok(response);
            }

            String sql = "SELECT * FROM users WHERE username = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);

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

            String sql = "SELECT id_front, id_back, lawyer_work_id, lawyer_certificate, " +
                    "lawyer_cv_data, lawyer_cv_name, lawyer_cv_size, lawyer_cv_type, " +
                    "lc_appointment_letter, lc_official_id, verification_documents, documents " +
                    "FROM users WHERE username = ?";
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);

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

            String sql = "UPDATE users SET approval_status = 'Approved' WHERE username = ?";
            int updated = jdbcTemplate.update(sql, username);

            if (updated > 0) {

                String getUserSql = "SELECT email, first_name FROM users WHERE username = ?";
                List<Map<String, Object>> userResults = jdbcTemplate.queryForList(getUserSql, username);

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

                        emailService.sendEmail(email, "Account Approved", emailBody);
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

            String sql = "UPDATE users SET approval_status = 'Rejected' WHERE username = ?";
            int updated = jdbcTemplate.update(sql, username);
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

            String checkSql = "SELECT COUNT(*) FROM users WHERE username = ?";
            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, username);
            if (count == null || count == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found"));
            }

            StringBuilder sql = new StringBuilder("UPDATE users SET ");
            List<Object> params = new ArrayList<>();
            boolean hasFields = false;
            boolean deactivating = false;

            if (userData.containsKey("firstName") && userData.get("firstName") != null) {
                sql.append("first_name = ?, ");
                params.add(userData.get("firstName"));
                hasFields = true;
            }
            if (userData.containsKey("lastName") && userData.get("lastName") != null) {
                sql.append("last_name = ?, ");
                params.add(userData.get("lastName"));
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
                sql.append("phone = ?, ");
                params.add(userData.get("phone"));
                hasFields = true;
            }
            if (userData.containsKey("email") && userData.get("email") != null) {
                String newEmail = String.valueOf(userData.get("email")).trim();
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
                params.add(userData.get("email"));
                hasFields = true;
            }
            if (userData.containsKey("district") && userData.get("district") != null) {
                sql.append("district = ?, ");
                params.add(userData.get("district"));
                hasFields = true;
            }
            if (userData.containsKey("subCounty") && userData.get("subCounty") != null) {
                sql.append("sub_county = ?, ");
                params.add(userData.get("subCounty"));
                hasFields = true;
            }
            if (userData.containsKey("parish") && userData.get("parish") != null) {
                sql.append("parish = ?, ");
                params.add(userData.get("parish"));
                hasFields = true;
            }
            if (userData.containsKey("village") && userData.get("village") != null) {
                sql.append("village = ?, ");
                params.add(userData.get("village"));
                hasFields = true;
            }
            if (userData.containsKey("nationalId") && userData.get("nationalId") != null) {
                sql.append("national_id = ?, ");
                params.add(userData.get("nationalId"));
                hasFields = true;
            }
            if (userData.containsKey("gender") && userData.get("gender") != null) {
                sql.append("gender = ?, ");
                params.add(userData.get("gender"));
                hasFields = true;
            }
            if (userData.containsKey("dateOfBirth") && userData.get("dateOfBirth") != null) {
                sql.append("date_of_birth = ?, ");
                params.add(userData.get("dateOfBirth"));
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
                sql.append("approval_status = ?, ");
                params.add(userData.get("approvalStatus"));
                if (deactivating) {
                    sql.append("is_active = ?, deactivated_at = COALESCE(deactivated_at, CURRENT_TIMESTAMP), ");
                    params.add(false);
                } else {
                    sql.append("is_active = ?, deactivated_at = NULL, ");
                    params.add(true);
                }
                hasFields = true;
            }
            if (userData.containsKey("userType") && userData.get("userType") != null) {
                sql.append("user_type = ?, ");
                params.add(userData.get("userType"));
                hasFields = true;
            }
            if (userData.containsKey("lawyerSpecialization") && userData.get("lawyerSpecialization") != null) {
                sql.append("lawyer_specialization = ?, ");
                params.add(userData.get("lawyerSpecialization"));
                hasFields = true;
            }
            if (userData.containsKey("lawFirmName") && userData.get("lawFirmName") != null) {
                sql.append("law_firm_name = ?, ");
                params.add(userData.get("lawFirmName"));
                hasFields = true;
            }
            if (userData.containsKey("lawSchool") && userData.get("lawSchool") != null) {
                sql.append("law_school = ?, ");
                params.add(userData.get("lawSchool"));
                hasFields = true;
            }
            if (userData.containsKey("yearsExperience") && userData.get("yearsExperience") != null) {
                sql.append("years_experience = ?, ");
                params.add(userData.get("yearsExperience"));
                hasFields = true;
            }
            if (userData.containsKey("barNumber") && userData.get("barNumber") != null) {
                sql.append("bar_number = ?, ");
                params.add(userData.get("barNumber"));
                hasFields = true;
            }
            if (userData.containsKey("lcLevel") && userData.get("lcLevel") != null) {
                sql.append("lc_level = ?, ");
                params.add(userData.get("lcLevel"));
                hasFields = true;
            }
            if (userData.containsKey("lcPosition") && userData.get("lcPosition") != null) {
                sql.append("lc_position = ?, ");
                params.add(userData.get("lcPosition"));
                hasFields = true;
            }
            if (userData.containsKey("organizationName") && userData.get("organizationName") != null) {
                sql.append("organization_name = ?, ");
                params.add(userData.get("organizationName"));
                hasFields = true;
            }
            if (userData.containsKey("organizationType") && userData.get("organizationType") != null) {
                sql.append("organization_type = ?, ");
                params.add(userData.get("organizationType"));
                hasFields = true;
            }
            if (userData.containsKey("specialization") && userData.get("specialization") != null) {
                sql.append("specialization = ?, ");
                params.add(userData.get("specialization"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinName") && userData.get("nextOfKinName") != null) {
                sql.append("next_of_kin_name = ?, ");
                params.add(userData.get("nextOfKinName"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinPhone") && userData.get("nextOfKinPhone") != null) {
                sql.append("next_of_kin_phone = ?, ");
                params.add(userData.get("nextOfKinPhone"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinEmail") && userData.get("nextOfKinEmail") != null) {
                sql.append("next_of_kin_email = ?, ");
                params.add(userData.get("nextOfKinEmail"));
                hasFields = true;
            }
            if (userData.containsKey("nextOfKinRelationship") && userData.get("nextOfKinRelationship") != null) {
                sql.append("next_of_kin_relationship = ?, ");
                params.add(userData.get("nextOfKinRelationship"));
                hasFields = true;
            }
            if (userData.containsKey("avatarData") && userData.get("avatarData") != null) {
                sql.append("avatar_data = ?, ");
                params.add(userData.get("avatarData"));
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

            logger.info("🔄 Updating user: " + username);
            logger.info("📝 Query: " + query);
            logger.info("📦 Params: " + params);

            int updated = jdbcTemplate.update(query, params.toArray());
            if (updated > 0) {
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

            String sql = "SELECT verification_status, verification_submitted_at, " +
                    "verification_reviewed_at, verification_reviewed_by, " +
                    "verification_rejection_reason FROM users WHERE username = ?";

            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);

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
