package lcdjp.cases;

import lcdjp.admin.AuditLogService;
import lcdjp.storage.FileRefService;
import lcdjp.notification.NotificationService;
import lcdjp.storage.ObjectStorageService;
import lcdjp.security.RequestIdentity;
import lcdjp.user.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseCreateUpdateServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private CaseService caseService;
    @Mock private NotificationService notificationService;
    @Mock private CaseClassificationService caseClassificationService;

    @InjectMocks
    private CaseCreationService caseCreationService;

    @InjectMocks
    private CaseUpdateService caseUpdateService;

    private static final String SINGLE_CASE_SQL = "SELECT * FROM cases WHERE case_reference = ?";

    @BeforeEach
    void wireCaseAccessService() {
        CaseAccessService caseAccessService = new CaseAccessService();
        ReflectionTestUtils.setField(caseAccessService, "jdbcTemplate", jdbcTemplate);
        ReflectionTestUtils.setField(caseAccessService, "requestIdentity", new RequestIdentity());
        CaseQueryRepository caseQueries = new CaseQueryRepository(jdbcTemplate);
        CaseNotificationRepository caseNotifications = new CaseNotificationRepository(jdbcTemplate);
        ReflectionTestUtils.setField(caseCreationService, "caseAccessService", caseAccessService);
        ReflectionTestUtils.setField(caseCreationService, "caseOfferService", new CaseOfferService(jdbcTemplate));
        ReflectionTestUtils.setField(caseCreationService, "caseQueries", caseQueries);
        ReflectionTestUtils.setField(caseCreationService, "caseNotifications", caseNotifications);
        ReflectionTestUtils.setField(caseUpdateService, "caseAccessService", caseAccessService);
        ReflectionTestUtils.setField(caseUpdateService, "caseQueries", caseQueries);
        ReflectionTestUtils.setField(caseUpdateService, "caseNotifications", caseNotifications);
        // Object storage is not configured in tests, so attachments stay inline exactly as before.
        FileRefService fileRefService = new FileRefService(new ObjectStorageService("", "", "", "", ""), "", "");
        ReflectionTestUtils.setField(caseCreationService, "fileRefService", fileRefService);
        ReflectionTestUtils.setField(caseUpdateService, "fileRefService", fileRefService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String username, String role) {
        User principal = new User();
        principal.setUsername(username);
        principal.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private void stubUserRow(String username, String role, String district) {
        Map<String, Object> row = new HashMap<>();
        row.put("username", username);
        row.put("role", role);
        row.put("district", district == null ? "" : district);
        lenient().when(jdbcTemplate.queryForList(
                eq("SELECT username, first_name, last_name, role, district FROM users WHERE username = ?"),
                eq(username)
        )).thenReturn(List.of(row));
    }

    private Map<String, Object> caseRow(String caseId, String citizenId, String district) {
        Map<String, Object> row = new HashMap<>();
        row.put("case_reference", caseId);
        row.put("citizen_id", citizenId);
        row.put("district", district == null ? "" : district);
        row.put("current_handler", "");
        row.put("assigned_lc", "");
        row.put("assigned_lawyer", "");
        row.put("selected_lawyer", "");
        row.put("assigned_org", "");
        return row;
    }

    private void stubCase(String caseId, Map<String, Object> row) {
        lenient().when(jdbcTemplate.queryForList(eq(SINGLE_CASE_SQL), eq(caseId)))
                .thenReturn(row == null ? List.of() : List.of(row));
    }

    private CreateCaseRequest createRequest(String caseReference, String citizenId) {
        CreateCaseRequest req = new CreateCaseRequest();
        req.setCaseReference(caseReference);
        req.setCitizenId(citizenId);
        req.setCaseType("Land Dispute");
        req.setDistrict("Kampala");
        return req;
    }

    @Test
    void createCase_unauthenticated_returns401() {
        ResponseEntity<?> result = caseCreationService.createCase(createRequest("C-1", "citizen1"), null);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void createCase_nonAdminForAnotherCitizen_returns403() {
        authenticateAs("mallory", "Citizen");
        stubUserRow("mallory", "Citizen", null);

        ResponseEntity<?> result = caseCreationService.createCase(createRequest("C-1", "citizen1"), null);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("INSERT INTO cases"), any(Object[].class));
    }

    @Test
    void createCase_successNoRoutingChoice_createsAndNotifiesAwaitingRouting() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);

        ResponseEntity<?> result = caseCreationService.createCase(createRequest("C-1", "citizen1"), null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("C-1", body.get("caseReference"));
        assertEquals("Case submitted. Awaiting routing choice.", body.get("message"));
        assertEquals("", body.get("assignedTo"));

        verify(jdbcTemplate).update(contains("INSERT INTO cases"), any(Object[].class));
        verify(jdbcTemplate).update(contains("routing_status = 'awaiting_routing_choice'"), eq("C-1"));
        verify(auditLogService).logAction(eq("citizen1"), eq("Citizen"), eq("CASE_CREATED"),
                eq("case"), eq("C-1"), anyString());
        verify(jdbcTemplate).update(contains("INSERT INTO notifications"), eq("citizen1"), anyString(), eq("C-1"));
    }

    @Test
    void createCase_withNewClientDraftId_insertsAndStoresTheDraftId() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setClientDraftId("draft-1234abcd");

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("INSERT INTO cases"), any(Object[].class));
        verify(jdbcTemplate).queryForList(contains("client_draft_id = ?"), eq("citizen1"), eq("draft-1234abcd"));
    }

    @Test
    void createCase_repeatedClientDraftId_returnsExistingCaseWithoutInserting() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        Map<String, Object> existing = new HashMap<>();
        existing.put("case_reference", "LCDJP-EXISTING-1");
        when(jdbcTemplate.queryForList(contains("client_draft_id = ?"), eq("citizen1"), eq("draft-1234abcd")))
                .thenReturn(List.of(existing));
        CreateCaseRequest req = createRequest(null, "citizen1");
        req.setClientDraftId("draft-1234abcd");

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        assertEquals(true, body.get("duplicate"));
        assertEquals("LCDJP-EXISTING-1", body.get("caseReference"));
        verify(jdbcTemplate, never()).update(contains("INSERT INTO cases"), any(Object[].class));
        verifyNoInteractions(auditLogService);
    }

    @Test
    void createCase_malformedClientDraftId_returns400() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setClientDraftId("bad id!'; --");

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("INSERT INTO cases"), any(Object[].class));
    }

    @Test
    void createCase_routingChoiceLc_recordsInfoOnly() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setRoutingChoice("lc");

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("Your report has been recorded for your records.", body.get("message"));
        verify(jdbcTemplate).update(contains("routing_status = 'info_only'"), eq("lc"), eq("C-1"));
    }

    @Test
    void createCase_seriousCrimeWithRoutingChoiceLc_isNotSentToLcMediation() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setCaseType("Others");
        req.setDescription("A man defiled my daughter");
        req.setRoutingChoice("lc");

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertNotEquals("Your report has been recorded for your records.", body.get("message"));
        assertEquals("PROTECTION", ((Map<?, ?>) body.get("jurisdiction")).get("track"));
        verify(jdbcTemplate).update(contains("jurisdiction_track"), eq("PROTECTION"), eq(true), eq("C-1"));
        verify(auditLogService).logAction(eq("citizen1"), eq("Citizen"), eq("CASE_URGENT_FLAGGED"),
                eq("case"), eq("C-1"), anyString());
    }

    @Test
    void createCase_routingChoiceLegalAid_noLawyerAvailable_returnsFallbackMessage() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setRoutingChoice("legal_aid");

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue(((String) body.get("message")).contains("No lawyer is available"));
        assertEquals("", body.get("assignedTo"));
        assertEquals("", body.get("assignedType"));
    }

    @Test
    void createCase_routingChoiceLegalAid_lawyerFound_assignsOffer() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setRoutingChoice("legal_aid");

        Map<String, Object> lawyerRow = new HashMap<>();
        lawyerRow.put("username", "lawyer1");
        lawyerRow.put("active_count", 0);
        when(jdbcTemplate.queryForList(contains("u.role = 'Lawyer'"), eq("Kampala"), eq("Land Dispute")))
                .thenReturn(List.of(lawyerRow));

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("lawyer1", body.get("assignedTo"));
        assertEquals("Lawyer", body.get("assignedType"));
        assertTrue(((String) body.get("message")).contains("matched your case to a lawyer"));
    }

    @Test
    void createCase_missingCaseTypeWithDescription_usesAiClassification() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setCaseType(null);
        req.setDescription("My landlord locked me out");
        CaseClassificationService.Result classification = new CaseClassificationService.Result();
        classification.suggestedCaseType = "Land Dispute";
        classification.legalRagUsed = false;
        when(caseClassificationService.classify(eq("My landlord locked me out"), eq("Kampala")))
                .thenReturn(classification);

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("INSERT INTO cases"), any(Object[].class));
        verify(caseClassificationService).classify("My landlord locked me out", "Kampala");
    }

    @Test
    void createCase_aiClassificationThrows_fallsBackToOthers() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CreateCaseRequest req = createRequest("C-1", "citizen1");
        req.setCaseType(null);
        req.setDescription("Something happened");
        when(caseClassificationService.classify(anyString(), anyString()))
                .thenThrow(new RuntimeException("model unavailable"));

        ResponseEntity<?> result = caseCreationService.createCase(req, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(jdbcTemplate).update(contains("INSERT INTO cases"), any(Object[].class));
    }

    @Test
    void createCase_dbErrorOnInsert_propagatesToGlobalExceptionHandler() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        when(jdbcTemplate.update(contains("INSERT INTO cases"), any(Object[].class)))
                .thenThrow(new RuntimeException("db down"));

        assertThrows(RuntimeException.class,
                () -> caseCreationService.createCase(createRequest("C-1", "citizen1"), null));
    }

    private CaseUpdateRequest statusUpdate(String status) {
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setStatus(status);
        return req;
    }

    @Test
    void updateCase_caseNotFound_returns404() {
        stubCase("C-404", null);
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-404", statusUpdate("Resolved"));

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void updateCase_unauthenticated_returns401() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", statusUpdate("Resolved"));

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void updateCase_noFieldsSupplied_returns400() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", new CaseUpdateRequest());

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("No fields to update", body.get("message"));
        verify(jdbcTemplate, never()).update(contains("UPDATE cases SET"), any(Object[].class));
    }

    @Test
    void updateCase_nonAdminChangingHandler_returns403() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setCurrentHandler("lawyer1");

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("UPDATE cases SET"), any(Object[].class));
    }

    @Test
    void updateCase_nonAdminChangingStatus_returns403() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", statusUpdate("Resolved"));

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(jdbcTemplate, never()).update(contains("UPDATE cases SET"), any(Object[].class));
    }

    @Test
    void updateCase_adminUpdatesStatus_success() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.update(eq("UPDATE cases SET status = ? WHERE case_reference = ?"),
                eq("Resolved"), eq("C-1"))).thenReturn(1);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", statusUpdate("Resolved"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        verify(auditLogService).logAction(eq("system"), eq("Admin"), eq("CASE_UPDATED"),
                eq("case"), eq("C-1"), contains("status"));
    }

    @Test
    void updateCase_adminChangingHandler_success() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setCurrentHandler("lawyer1");
        when(jdbcTemplate.update(eq("UPDATE cases SET current_handler = ? WHERE case_reference = ?"),
                eq("lawyer1"), eq("C-1"))).thenReturn(1);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void updateCase_zeroRowsAffected_returns404() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.update(eq("UPDATE cases SET status = ? WHERE case_reference = ?"),
                eq("Resolved"), eq("C-1"))).thenReturn(0);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", statusUpdate("Resolved"));

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verify(auditLogService, never()).logAction(anyString(), anyString(), eq("CASE_UPDATED"), anyString(), anyString(), anyString());
    }

    @Test
    void updateCase_referralWithoutNotes_returns400() {
        stubCase("C-1", caseRow("C-1", "citizen1", "Kampala"));
        authenticateAs("lc1", "LC1");
        stubUserRow("lc1", "LC1", "Kampala");
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setReferredTo("Police");

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("lc_referral_notes is required when referring a case", body.get("error"));
    }

    @Test
    void updateCase_referralByUnrelatedNonLc_returns403() {
        stubCase("C-1", caseRow("C-1", "citizen1", "Kampala"));
        authenticateAs("mallory", "Citizen");
        stubUserRow("mallory", "Citizen", null);
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setReferredTo("Police");
        req.setLcReferralNotes("See attached statement");

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void updateCase_referralByDistrictLc_success_logsForwardedAndUpdated() {
        stubCase("C-1", caseRow("C-1", "citizen1", "Kampala"));
        authenticateAs("lc1", "LC1");
        stubUserRow("lc1", "LC1", "Kampala");
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setReferredTo("Police");
        req.setLcReferralNotes("See attached statement");
        when(jdbcTemplate.update(eq("UPDATE cases SET lc_referral_notes = ?, referred_to = ? WHERE case_reference = ?"),
                eq("See attached statement"), eq("Police"), eq("C-1"))).thenReturn(1);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(auditLogService).logAction(eq("lc1"), eq("LC Official"), eq("CASE_FORWARDED"),
                eq("case"), eq("C-1"), anyString());
        verify(auditLogService).logAction(eq("system"), eq("Admin"), eq("CASE_UPDATED"),
                eq("case"), eq("C-1"), anyString());
    }

    @Test
    void updateCase_citizenReopen_byNonOwner_returns403() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("mallory", "Citizen");
        stubUserRow("mallory", "Citizen", null);
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setRoutingStatus("reopened_by_citizen");

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void updateCase_citizenReopen_byOwner_success() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setRoutingStatus("reopened_by_citizen");
        when(jdbcTemplate.update(eq("UPDATE cases SET routing_status = ? WHERE case_reference = ?"),
                eq("reopened_by_citizen"), eq("C-1"))).thenReturn(1);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void updateCase_messagingFlagsBooleans_mapToOneAndZero() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        CaseUpdateRequest req = new CaseUpdateRequest();
        req.setMessagingEnabled(false);
        req.setMessagingLocked(true);
        when(jdbcTemplate.update(
                eq("UPDATE cases SET messaging_enabled = ?, messaging_locked = ? WHERE case_reference = ?"),
                eq(0), eq(1), eq("C-1"))).thenReturn(1);

        ResponseEntity<?> result = caseUpdateService.updateCase("C-1", req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void updateCase_dbError_propagatesToGlobalExceptionHandler() {
        stubCase("C-1", caseRow("C-1", "citizen1", null));
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.update(eq("UPDATE cases SET status = ? WHERE case_reference = ?"),
                eq("Resolved"), eq("C-1"))).thenThrow(new RuntimeException("db down"));

        assertThrows(RuntimeException.class,
                () -> caseUpdateService.updateCase("C-1", statusUpdate("Resolved")));
    }
}
