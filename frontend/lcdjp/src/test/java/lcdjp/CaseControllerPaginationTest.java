package lcdjp;

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
class CaseControllerPaginationTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private CaseController caseController;

    private static final String ADMIN_USERNAME = "sysadmin1";

    private void authenticateAsSystemAdmin() {
        User principal = new User();
        principal.setUsername(ADMIN_USERNAME);
        principal.setRole("SYSTEM_ADMIN");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    @BeforeEach
    void setUp() {
        CaseAccessService caseAccessService = new CaseAccessService();
        ReflectionTestUtils.setField(caseAccessService, "jdbcTemplate", jdbcTemplate);
        ReflectionTestUtils.setField(caseAccessService, "requestIdentity", new RequestIdentity());
        ReflectionTestUtils.setField(caseController, "caseAccessService", caseAccessService);

        authenticateAsSystemAdmin();
        Map<String, Object> adminRow = new HashMap<>();
        adminRow.put("username", ADMIN_USERNAME);
        adminRow.put("role", "SYSTEM_ADMIN");
        adminRow.put("district", "");
        lenient().when(jdbcTemplate.queryForList(
                eq("SELECT username, first_name, last_name, role, district FROM users WHERE username = ?"),
                eq(ADMIN_USERNAME)
        )).thenReturn(List.of(adminRow));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void omittingPageParamsReturnsFullListWithNoLimitAndNoExtraEnvelopeFields() {
        Map<String, Object> case1 = Map.of("case_reference", "C-1");
        Map<String, Object> case2 = Map.of("case_reference", "C-2");
        String expectedSql = "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                "FROM cases c " +
                "LEFT JOIN users u ON c.citizen_id = u.username " +
                "ORDER BY c.created_at DESC";
        when(jdbcTemplate.queryForList(eq(expectedSql + " LIMIT ?"), eq(5000)))
                .thenReturn(List.of(case1, case2));

        ResponseEntity<?> result = caseController.getAllCases(null, null);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(List.of(case1, case2), body.get("cases"));
        assertFalse(body.containsKey("page"), "unpaginated response must not gain a page field");
        assertFalse(body.containsKey("pageSize"), "unpaginated response must not gain a pageSize field");
        assertFalse(body.containsKey("totalCount"), "unpaginated response must not gain a totalCount field");
        verify(jdbcTemplate, never()).queryForObject(contains("COUNT(*)"), eq(Long.class));
    }

    @Test
    void pageSizeAppliesLimitOffsetAndReturnsTotalCount() {
        String baseSql = "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS citizen_name " +
                "FROM cases c " +
                "LEFT JOIN users u ON c.citizen_id = u.username " +
                "ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
        Map<String, Object> case3 = Map.of("case_reference", "C-3");
        when(jdbcTemplate.queryForObject(
                eq("SELECT COUNT(*) FROM cases c LEFT JOIN users u ON c.citizen_id = u.username"),
                eq(Long.class)))
                .thenReturn(57L);
        when(jdbcTemplate.queryForList(eq(baseSql), eq(20), eq(40)))
                .thenReturn(List.of(case3));

        ResponseEntity<?> result = caseController.getAllCases(3, 20);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(List.of(case3), body.get("cases"));
        assertEquals(3, body.get("page"));
        assertEquals(20, body.get("pageSize"));
        assertEquals(57L, body.get("totalCount"));
    }

    @Test
    void pageSizeIsCappedAtFiveHundredEvenIfCallerAsksForMore() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT COUNT(*) FROM cases c LEFT JOIN users u ON c.citizen_id = u.username"),
                eq(Long.class)))
                .thenReturn(0L);
        when(jdbcTemplate.queryForList(anyString(), eq(500), eq(0)))
                .thenReturn(List.of());

        ResponseEntity<?> result = caseController.getAllCases(1, 100_000);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(500, body.get("pageSize"), "an oversized pageSize request must be clamped, not honored as-is");
    }

    @Test
    void pageDefaultsToOneWhenOnlyPageSizeIsGiven() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT COUNT(*) FROM cases c LEFT JOIN users u ON c.citizen_id = u.username"),
                eq(Long.class)))
                .thenReturn(0L);
        when(jdbcTemplate.queryForList(anyString(), eq(25), eq(0)))
                .thenReturn(List.of());

        ResponseEntity<?> result = caseController.getAllCases(null, 25);

        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(1, body.get("page"));
    }
}
