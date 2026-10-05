package lcdjp;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private EmailService emailService;
    @Mock private PhoneUtil phoneUtil;
    @Mock private RequestIdentity requestIdentity;
    @Mock private VerificationDecisionService verificationDecisionService;
    @Mock private HttpServletRequest httpRequest;

    @InjectMocks
    private AdminUserController controller;

    private void identityAs(String username, String role, String district) {
        lenient().when(requestIdentity.resolveUsername(httpRequest)).thenReturn(username);
        lenient().when(requestIdentity.resolveRole(httpRequest, username)).thenReturn(role);
        lenient().when(requestIdentity.resolveDistrict(httpRequest, username)).thenReturn(district);
    }

    private void unauthenticated() {
        when(requestIdentity.resolveUsername(httpRequest)).thenReturn(null);
    }

    private void stubTargetRow(String targetUsername, String district, String role, LocalDateTime submittedAt) {
        Map<String, Object> row = new HashMap<>();
        row.put("district", district);
        row.put("role", role);
        row.put("verification_submitted_at", submittedAt);
        when(jdbcTemplate.queryForMap(anyString(), eq(targetUsername))).thenReturn(row);
    }

    @Test
    void getAllUsers_noAuth_returns401() {
        unauthenticated();

        ResponseEntity<?> result = controller.getAllUsers(httpRequest, null, null);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getAllUsers_nonAdminRole_returns403() {
        identityAs("citizen1", "Citizen", null);

        ResponseEntity<?> result = controller.getAllUsers(httpRequest, null, null);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getAllUsers_systemAdmin_unpaginated_excludesSystemAdminRow() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForList(contains("username != 'system_admin'")))
                .thenReturn(List.of(new HashMap<>(Map.of("username", "u1", "district", "Kampala"))));
        when(jdbcTemplate.queryForList(contains("role)) IN"), eq(String.class)))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.getAllUsers(httpRequest, null, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) result.getBody();
        assertEquals(true, body.get("success"));
        assertFalse(body.containsKey("page"));
    }

    @Test
    void getAllUsers_systemAdmin_paginated_returnsPageMetadata() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(contains("SELECT COUNT(*)"), eq(Long.class)))
                .thenReturn(42L);
        when(jdbcTemplate.queryForList(contains("LIMIT ? OFFSET ?"), eq(10), eq(10)))
                .thenReturn(List.of(new HashMap<>(Map.of("username", "u1", "district", "Kampala"))));
        when(jdbcTemplate.queryForList(contains("role)) IN"), eq(String.class)))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.getAllUsers(httpRequest, 2, 10);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) result.getBody();
        assertEquals(2, body.get("page"));
        assertEquals(10, body.get("pageSize"));
        assertEquals(42L, body.get("totalCount"));
    }

    @Test
    void getAllUsers_districtAdmin_scopesToOwnDistrict() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        when(jdbcTemplate.queryForList(contains("WHERE district = ?"), eq("Kampala")))
                .thenReturn(List.of(new HashMap<>(Map.of("username", "u1", "district", "Kampala"))));

        ResponseEntity<?> result = controller.getAllUsers(httpRequest, null, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).queryForList(contains("WHERE district = ?"), eq("Kampala"));
    }

    @Test
    void getAllUsers_districtAdmin_noDistrictAssigned_returns403() {
        identityAs("distadmin", "DISTRICT_ADMIN", null);

        ResponseEntity<?> result = controller.getAllUsers(httpRequest, null, null);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getPendingVerifications_nonAdmin_returns403() {
        identityAs("citizen1", "Citizen", null);

        ResponseEntity<?> result = controller.getPendingVerifications(httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getPendingVerifications_districtAdmin_filtersByTrimmedLowercasedDistrict() {
        identityAs("distadmin", "DISTRICT_ADMIN", " Kampala ");
        when(jdbcTemplate.queryForList(contains("LOWER(TRIM(district)) = LOWER(TRIM(?))"), eq("Kampala")))
                .thenReturn(List.of());
        when(jdbcTemplate.queryForList(contains("role)) IN"), eq(String.class)))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.getPendingVerifications(httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).queryForList(contains("LOWER(TRIM(district))"), eq("Kampala"));
    }

    @Test
    void getPendingUsers_districtAdmin_noDistrict_returns403() {
        identityAs("distadmin", "DISTRICT_ADMIN", "");

        ResponseEntity<?> result = controller.getPendingUsers(httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getUserByUsername_noAuth_returns401() {
        unauthenticated();

        ResponseEntity<?> result = controller.getUserByUsername("someone", httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getUserByUsername_ownAccount_allowedEvenWithoutAdminRole() {
        identityAs("jdoe", "Citizen", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("jdoe"))).thenReturn(1);
        when(jdbcTemplate.queryForList(contains("SELECT * FROM users"), eq("jdoe")))
                .thenReturn(List.of(new HashMap<>(Map.of("username", "jdoe", "password_hash", "secret"))));

        ResponseEntity<?> result = controller.getUserByUsername("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getUserByUsername_otherUserAsNonAdmin_returns403() {
        identityAs("jdoe", "Citizen", null);

        ResponseEntity<?> result = controller.getUserByUsername("someoneelse", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getUserByUsername_adminViewingUser_stripsPasswordHash() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("jdoe"))).thenReturn(1);
        Map<String, Object> row = new HashMap<>();
        row.put("username", "jdoe");
        row.put("password_hash", "secret-hash");
        row.put("district", "Kampala");
        when(jdbcTemplate.queryForList(contains("SELECT * FROM users"), eq("jdoe"))).thenReturn(List.of(row));

        ResponseEntity<?> result = controller.getUserByUsername("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) result.getBody();
        @SuppressWarnings("unchecked")
        Map<String, Object> user = (Map<String, Object>) body.get("user");
        assertFalse(user.containsKey("password_hash"), "password hash must never be returned to the client");
    }

    @Test
    void getUserByUsername_notFound_returnsOkWithDeletedFlag() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("ghost"))).thenReturn(0);

        ResponseEntity<?> result = controller.getUserByUsername("ghost", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) result.getBody();
        assertEquals(false, body.get("success"));
        assertEquals(true, body.get("deleted"));
    }

    @Test
    void getUserDocuments_districtAdmin_crossDistrict_returns403() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        when(jdbcTemplate.queryForObject(contains("SELECT district"), eq(String.class), eq("jdoe")))
                .thenReturn("Gulu");

        ResponseEntity<?> result = controller.getUserDocuments("jdoe", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getUserDocuments_districtAdmin_sameDistrict_returns200() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        when(jdbcTemplate.queryForObject(contains("SELECT district"), eq(String.class), eq("jdoe")))
                .thenReturn("Kampala");
        when(jdbcTemplate.queryForList(contains("id_front"), eq("jdoe")))
                .thenReturn(List.of(new HashMap<>()));

        ResponseEntity<?> result = controller.getUserDocuments("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void approveUser_noAuth_returns401() {
        unauthenticated();

        ResponseEntity<?> result = controller.approveUser("jdoe", httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void approveUser_systemAdmin_districtHasAssignedAdminAndNotOverdue_returns403() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("jdoe", "Kampala", "Citizen", LocalDateTime.now().minusHours(1));
        when(verificationDecisionService.hasDistrictAdminForDistrict("Kampala")).thenReturn(true);

        ResponseEntity<?> result = controller.approveUser("jdoe", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("approval_status = 'Approved'"), any(Object.class));
    }

    @Test
    void approveUser_systemAdmin_canOverrideAfter24Hours() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("jdoe", "Kampala", "Citizen", LocalDateTime.now().minusHours(48));
        when(verificationDecisionService.hasDistrictAdminForDistrict("Kampala")).thenReturn(true);
        when(jdbcTemplate.update(contains("approval_status = 'Approved'"), eq("jdoe"))).thenReturn(1);
        when(jdbcTemplate.queryForList(contains("SELECT email, first_name"), eq("jdoe")))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.approveUser("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(eq("jdoe"), anyString(), eq("USER_APPROVED"), eq("user"), eq("jdoe"), anyString());
    }

    @Test
    void approveUser_districtAdmin_ownDistrict_sendsApprovalEmail() throws IOException {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        stubTargetRow("jdoe", "Kampala", "Citizen", null);
        when(jdbcTemplate.update(contains("approval_status = 'Approved'"), eq("jdoe"))).thenReturn(1);
        when(jdbcTemplate.queryForList(contains("SELECT email, first_name"), eq("jdoe")))
                .thenReturn(List.of(new HashMap<>(Map.of("email", "jdoe@example.com", "first_name", "Jane"))));

        ResponseEntity<?> result = controller.approveUser("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(emailService).sendEmail(eq("jdoe@example.com"), anyString(), anyString());
    }

    @Test
    void approveUser_districtAdmin_crossDistrict_returns403() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        stubTargetRow("jdoe", "Gulu", "Citizen", null);

        ResponseEntity<?> result = controller.approveUser("jdoe", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void approveUser_targetNotFound_returns404() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("ghost", null, null, null);
        when(jdbcTemplate.update(contains("approval_status = 'Approved'"), eq("ghost"))).thenReturn(0);

        ResponseEntity<?> result = controller.approveUser("ghost", httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void rejectUser_districtAdmin_ownDistrict_updatesAndAudits() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        stubTargetRow("jdoe", "Kampala", "Citizen", null);
        when(jdbcTemplate.update(contains("approval_status = 'Rejected'"), eq("jdoe"))).thenReturn(1);

        ResponseEntity<?> result = controller.rejectUser("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(eq("jdoe"), anyString(), eq("USER_REJECTED"), eq("user"), eq("jdoe"), anyString());
    }

    @Test
    void rejectUser_crossDistrict_returns403() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        stubTargetRow("jdoe", "Gulu", "Citizen", null);

        ResponseEntity<?> result = controller.rejectUser("jdoe", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("approval_status = 'Rejected'"), any(Object.class));
    }

    @Test
    void deactivate_setsDisabledInactiveAndStampsDeactivatedAt_andAudits() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("jdoe", "Kampala", "Citizen", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("jdoe"))).thenReturn(1);
        when(jdbcTemplate.update(startsWith("UPDATE users SET"), any(Object[].class))).thenReturn(1);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setApprovalStatus("Disabled");

        ResponseEntity<?> result = controller.updateUser("jdoe", request, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(
                argThat((String q) -> q.contains("approval_status = ?")
                        && q.contains("is_active = ?")
                        && q.contains("deactivated_at = COALESCE(deactivated_at, CURRENT_TIMESTAMP)")),
                any(Object[].class));
        verify(auditLogService).logAction(eq("jdoe"), anyString(), eq("USER_DEACTIVATED"), eq("user"), eq("jdoe"), anyString());
    }

    @Test
    void reactivate_clearsDeactivatedAt() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("jdoe", "Kampala", "Citizen", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("jdoe"))).thenReturn(1);
        when(jdbcTemplate.update(startsWith("UPDATE users SET"), any(Object[].class))).thenReturn(1);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setApprovalStatus("Approved");

        ResponseEntity<?> result = controller.updateUser("jdoe", request, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(
                argThat((String q) -> q.contains("is_active = ?") && q.contains("deactivated_at = NULL")),
                any(Object[].class));
    }

    @Test
    void deactivate_systemAdminAccount_isProtected() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("system_admin", null, "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("system_admin"))).thenReturn(1);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setApprovalStatus("Disabled");

        ResponseEntity<?> result = controller.updateUser("system_admin", request, httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(startsWith("UPDATE users SET"), any(Object[].class));
    }

    @Test
    void deactivate_ownAccount_isRejected() {
        identityAs("sysadmin2", "SYSTEM_ADMIN", null);
        stubTargetRow("sysadmin2", null, "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("sysadmin2"))).thenReturn(1);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setApprovalStatus("Disabled");

        ResponseEntity<?> result = controller.updateUser("sysadmin2", request, httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(startsWith("UPDATE users SET"), any(Object[].class));
    }

    @Test
    void noDeleteEndpointExistsForUsers() {
        boolean hasDeleteMapping = java.util.Arrays.stream(AdminUserController.class.getDeclaredMethods())
                .anyMatch(m -> m.isAnnotationPresent(org.springframework.web.bind.annotation.DeleteMapping.class));
        org.junit.jupiter.api.Assertions.assertFalse(hasDeleteMapping,
                "Accounts must never be deletable by hand; deactivate instead");
    }

    @Test
    void updateUser_noFieldsProvided_returns400() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("jdoe", "Kampala", "Citizen", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("jdoe"))).thenReturn(1);

        ResponseEntity<?> result = controller.updateUser("jdoe", new AdminUserUpdateRequest(), httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(startsWith("UPDATE users SET"), any(Object[].class));
    }

    @Test
    void updateUser_withFields_updatesAndAudits() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("jdoe", "Kampala", "Citizen", null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("jdoe"))).thenReturn(1);
        when(jdbcTemplate.update(startsWith("UPDATE users SET"), any(Object[].class))).thenReturn(1);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setFirstName("Jane");
        request.setPhone("0700111222");

        ResponseEntity<?> result = controller.updateUser("jdoe", request, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(eq("jdoe"), anyString(), eq("USER_UPDATED"), eq("user"), eq("jdoe"), anyString());
    }

    @Test
    void updateUser_districtAdmin_crossDistrict_returns403() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        stubTargetRow("jdoe", "Gulu", "Citizen", null);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setFirstName("Jane");

        ResponseEntity<?> result = controller.updateUser("jdoe", request, httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(startsWith("UPDATE users SET"), any(Object[].class));
    }

    @Test
    void updateUser_targetNotFound_returns404() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        stubTargetRow("ghost", null, null, null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Integer.class), eq("ghost"))).thenReturn(0);

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setFirstName("Jane");

        ResponseEntity<?> result = controller.updateUser("ghost", request, httpRequest);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void approveVerification_nonAdmin_returns403() {
        identityAs("citizen1", "Citizen", null);

        ResponseEntity<?> result = controller.approveVerification("jdoe", Map.of(), httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(verificationDecisionService);
    }

    @Test
    void approveVerification_systemAdmin_delegatesToVerificationDecisionService() {
        identityAs("sysadmin", "SYSTEM_ADMIN", "Kampala");
        ResponseEntity<Object> expected = ResponseEntity.ok(Map.of("success", true));
        doReturn(expected).when(verificationDecisionService)
                .approve("sysadmin", "SYSTEM_ADMIN", "Kampala", "jdoe");

        ResponseEntity<?> result = controller.approveVerification("jdoe", Map.of(), httpRequest);

        assertSame(expected, result);
    }

    @Test
    void rejectVerification_districtAdmin_delegatesWithReason() {
        identityAs("distadmin", "DISTRICT_ADMIN", "Kampala");
        VerificationDecisionRequest request = new VerificationDecisionRequest();
        request.setReason("Documents illegible");
        ResponseEntity<Object> expected = ResponseEntity.ok(Map.of("success", true));
        doReturn(expected).when(verificationDecisionService)
                .reject("distadmin", "DISTRICT_ADMIN", "Kampala", "jdoe", "Documents illegible");

        ResponseEntity<?> result = controller.rejectVerification("jdoe", request, httpRequest);

        assertSame(expected, result);
    }

    @Test
    void rejectVerification_noAuth_returns401() {
        unauthenticated();

        ResponseEntity<?> result = controller.rejectVerification("jdoe", new VerificationDecisionRequest(), httpRequest);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(verificationDecisionService);
    }

    @Test
    void getVerificationStatus_invalidUsername_returns400() {
        ResponseEntity<?> result = controller.getVerificationStatus("undefined", httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(requestIdentity);
    }

    @Test
    void getVerificationStatus_ownStatus_allowedWithoutAdminRole() {
        identityAs("jdoe", "Citizen", null);
        when(jdbcTemplate.queryForList(contains("verification_status"), eq("jdoe")))
                .thenReturn(List.of(new HashMap<>(Map.of("verification_status", "PENDING"))));

        ResponseEntity<?> result = controller.getVerificationStatus("jdoe", httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getVerificationStatus_otherUsersStatusAsNonAdmin_returns403() {
        identityAs("jdoe", "Citizen", null);

        ResponseEntity<?> result = controller.getVerificationStatus("someoneelse", httpRequest);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void updateVerificationStatus_invalidStatusValue_returns400() {
        identityAs("sysadmin", "SYSTEM_ADMIN", null);
        VerificationDecisionRequest request = new VerificationDecisionRequest();
        request.setStatus("MAYBE");

        ResponseEntity<?> result = controller.updateVerificationStatus("jdoe", request, httpRequest);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(verificationDecisionService);
    }

    @Test
    void updateVerificationStatus_approved_delegatesAndReAddsStatusField() {
        identityAs("sysadmin", "SYSTEM_ADMIN", "Kampala");
        VerificationDecisionRequest request = new VerificationDecisionRequest();
        request.setStatus("approved");
        doReturn(ResponseEntity.ok(new HashMap<>(Map.of("success", true))))
                .when(verificationDecisionService)
                .approve("sysadmin", "SYSTEM_ADMIN", "Kampala", "jdoe");

        ResponseEntity<?> result = controller.updateVerificationStatus("jdoe", request, httpRequest);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) result.getBody();
        assertEquals("APPROVED", body.get("status"));
    }
}
