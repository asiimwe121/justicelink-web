package lcdjp.cases;

import lcdjp.admin.AuditLogService;
import lcdjp.notification.NotificationService;
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
class CaseControllerCoreTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private AuditLogService auditLogService;
    @Mock private CaseService caseService;
    @Mock private NotificationService notificationService;
    @Mock private CaseClassificationService caseClassificationService;

    @InjectMocks
    private CaseController caseController;

    private static final String GET_CASE_SQL =
            "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
            "FROM cases c " +
            "LEFT JOIN users u ON c.citizen_id = u.username " +
            "WHERE c.case_reference = ?";

    @BeforeEach
    void wireCaseAccessService() {
        CaseAccessService caseAccessService = new CaseAccessService();
        ReflectionTestUtils.setField(caseAccessService, "jdbcTemplate", jdbcTemplate);
        ReflectionTestUtils.setField(caseAccessService, "requestIdentity", new RequestIdentity());
        ReflectionTestUtils.setField(caseController, "caseAccessService", caseAccessService);
        ReflectionTestUtils.setField(caseController, "caseQueries", new CaseQueryRepository(jdbcTemplate));
        ReflectionTestUtils.setField(caseController, "caseNotifications", new CaseNotificationRepository(jdbcTemplate));
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

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCase_notFound_returns404() {
        when(jdbcTemplate.queryForList(eq(GET_CASE_SQL), eq("C-404"))).thenReturn(List.of());

        ResponseEntity<?> result = caseController.getCase("C-404");

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void getCase_noAuthenticatedUser_returns401() {
        Map<String, Object> caseRow = new HashMap<>();
        caseRow.put("case_reference", "C-1");
        caseRow.put("citizen_id", "citizen1");
        when(jdbcTemplate.queryForList(eq(GET_CASE_SQL), eq("C-1"))).thenReturn(List.of(caseRow));

        ResponseEntity<?> result = caseController.getCase("C-1");

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
    }

    @Test
    void getCase_unrelatedCitizen_returns403() {
        Map<String, Object> caseRow = new HashMap<>();
        caseRow.put("case_reference", "C-1");
        caseRow.put("citizen_id", "citizen1");
        caseRow.put("current_handler", "");
        caseRow.put("assigned_lc", "");
        caseRow.put("assigned_lawyer", "");
        caseRow.put("selected_lawyer", "");
        caseRow.put("assigned_org", "");
        when(jdbcTemplate.queryForList(eq(GET_CASE_SQL), eq("C-1"))).thenReturn(List.of(caseRow));
        when(jdbcTemplate.queryForObject(contains("audit_logs"), eq(Integer.class), eq("C-1"), eq("stranger")))
                .thenReturn(0);

        authenticateAs("stranger", "Citizen");
        stubUserRow("stranger", "Citizen", null);

        ResponseEntity<?> result = caseController.getCase("C-1");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void getCase_ownerCitizen_returnsNormalizedCase() {
        Map<String, Object> caseRow = new HashMap<>();
        caseRow.put("case_reference", "C-1");
        caseRow.put("citizen_id", "citizen1");
        caseRow.put("case_type", "Land Dispute");
        caseRow.put("current_handler", "");
        caseRow.put("assigned_lc", "");
        caseRow.put("assigned_lawyer", "");
        caseRow.put("selected_lawyer", "");
        caseRow.put("assigned_org", "");
        when(jdbcTemplate.queryForList(eq(GET_CASE_SQL), eq("C-1"))).thenReturn(List.of(caseRow));
        when(jdbcTemplate.queryForList(contains("audit_logs"), eq("C-1"))).thenReturn(List.of());

        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);

        ResponseEntity<?> result = caseController.getCase("C-1");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        Map<?, ?> data = (Map<?, ?>) body.get("case");
        assertEquals("C-1", data.get("caseId"));
        assertEquals("Land Dispute", data.get("caseType"));
    }

    @Test
    void getCase_districtAdmin_canAccessAnyCaseAsAdministrator() {
        Map<String, Object> caseRow = new HashMap<>();
        caseRow.put("case_reference", "C-1");
        caseRow.put("citizen_id", "someone_else");
        when(jdbcTemplate.queryForList(eq(GET_CASE_SQL), eq("C-1"))).thenReturn(List.of(caseRow));
        when(jdbcTemplate.queryForList(contains("audit_logs"), eq("C-1"))).thenReturn(List.of());

        authenticateAs("distadmin1", "DISTRICT_ADMIN");
        stubUserRow("distadmin1", "DISTRICT_ADMIN", "Kampala");

        ResponseEntity<?> result = caseController.getCase("C-1");

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void deleteCase_nonAdministrator_returns403() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);

        ResponseEntity<?> result = caseController.deleteCase("C-1");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void deleteCase_unauthenticated_returns403() {
        ResponseEntity<?> result = caseController.deleteCase("C-1");

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
    }

    @Test
    void deleteCase_notFound_returns404() {
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.update(eq("DELETE FROM cases WHERE case_reference = ?"), eq("C-404"))).thenReturn(0);

        ResponseEntity<?> result = caseController.deleteCase("C-404");

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void deleteCase_success_deletesAndAudits() {
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.update(eq("DELETE FROM cases WHERE case_reference = ?"), eq("C-1"))).thenReturn(1);

        ResponseEntity<?> result = caseController.deleteCase("C-1");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        verify(auditLogService).logAction(eq("sysadmin1"), eq("SYSTEM_ADMIN"), eq("CASE_DELETED"), eq("case"), eq("C-1"), anyString());
    }

    private AssignHandlerRequest assignRequest(String handler, String role) {
        AssignHandlerRequest r = new AssignHandlerRequest();
        r.setCurrentHandler(handler);
        r.setHandlerRole(role);
        return r;
    }

    @Test
    void assignHandler_nonAdministrator_returns403() {
        authenticateAs("citizen1", "Citizen");
        stubUserRow("citizen1", "Citizen", null);

        ResponseEntity<?> result = caseController.assignHandler("C-1", assignRequest("lawyer1", "Lawyer"));

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void assignHandler_caseNotFound_returns404() {
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM cases WHERE case_reference = ?"),
                eq(Integer.class), eq("C-404"))).thenReturn(0);

        ResponseEntity<?> result = caseController.assignHandler("C-404", assignRequest("lawyer1", "Lawyer"));

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(false, body.get("success"));
    }

    @Test
    void assignHandler_success_updatesCaseAndAuditsWithDefaultedMessagingFlags() {
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM cases WHERE case_reference = ?"),
                eq(Integer.class), eq("C-1"))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), eq("lawyer1"), eq("Lawyer"), eq(1), eq(0), eq("C-1")))
                .thenReturn(1);

        ResponseEntity<?> result = caseController.assignHandler("C-1", assignRequest("lawyer1", "Lawyer"));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("lawyer1", body.get("currentHandler"));
        assertEquals("Lawyer", body.get("handlerRole"));
        assertEquals(true, body.get("messagingEnabled"));
        verify(auditLogService).logAction(eq("lawyer1"), eq("Lawyer"), eq("CASE_ASSIGNED"),
                eq("case"), eq("C-1"), anyString());
    }

    @Test
    void assignHandler_updateAffectsZeroRows_returns500() {
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM cases WHERE case_reference = ?"),
                eq(Integer.class), eq("C-1"))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), eq("lawyer1"), eq("Lawyer"), eq(1), eq(0), eq("C-1")))
                .thenReturn(0);

        ResponseEntity<?> result = caseController.assignHandler("C-1", assignRequest("lawyer1", "Lawyer"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void assignHandler_explicitMessagingFlagsAreHonored() {
        authenticateAs("sysadmin1", "SYSTEM_ADMIN");
        stubUserRow("sysadmin1", "SYSTEM_ADMIN", null);
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM cases WHERE case_reference = ?"),
                eq(Integer.class), eq("C-1"))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), eq("lawyer1"), eq("Lawyer"), eq(0), eq(1), eq("C-1")))
                .thenReturn(1);

        AssignHandlerRequest req = assignRequest("lawyer1", "Lawyer");
        req.setMessagingEnabled(false);
        req.setMessagingLocked(true);

        ResponseEntity<?> result = caseController.assignHandler("C-1", req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(false, body.get("messagingEnabled"));
    }
}
