package lcdjp.cases;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Who may open a case: the authorization rule every case endpoint relies on. */
class CaseAccessServiceTest {

    /** Hand-rolled fake so the varargs query methods need no Mockito matcher tricks. */
    private static class FakeJdbc extends JdbcTemplate {
        final Map<String, String> roles = new HashMap<>();
        int previousHandlerCount = 0;
        boolean previousHandlerLookupFails = false;

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            if (sql.contains("FROM users")) {
                String username = String.valueOf(args[0]);
                String role = roles.get(username);
                if (role == null) {
                    return List.of();
                }
                return List.of(Map.of("username", username, "role", role));
            }
            return List.of();
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (previousHandlerLookupFails) {
                throw new org.springframework.dao.DataAccessResourceFailureException("database is down");
            }
            return requiredType.cast(previousHandlerCount);
        }
    }

    private FakeJdbc jdbc;
    private CaseAccessService service;

    @BeforeEach
    void setUp() {
        jdbc = new FakeJdbc();
        jdbc.roles.put("alice", "Citizen");
        jdbc.roles.put("mallory", "Citizen");
        jdbc.roles.put("boss", "SYSTEM_ADMIN");
        service = new CaseAccessService();
        ReflectionTestUtils.setField(service, "jdbcTemplate", jdbc);
    }

    private static Map<String, Object> caseOwnedBy(String citizen) {
        Map<String, Object> row = new HashMap<>();
        row.put("case_reference", "CASE-1");
        row.put("citizen_id", citizen);
        return row;
    }

    @Test
    void theCitizenWhoFiledTheCaseCanOpenIt() {
        assertTrue(service.canAccessCase("alice", caseOwnedBy("alice")));
    }

    @Test
    void anotherCitizenCannotOpenIt() {
        assertFalse(service.canAccessCase("mallory", caseOwnedBy("alice")));
    }

    @Test
    void administratorsCanOpenAnyCase() {
        assertTrue(service.canAccessCase("boss", caseOwnedBy("alice")));
    }

    @Test
    void theAssignedLawyerAndCurrentHandlerCanOpenIt() {
        Map<String, Object> row = caseOwnedBy("alice");
        row.put("assigned_lawyer", "lawyer1");
        row.put("current_handler", "lc1");
        assertTrue(service.canAccessCase("lawyer1", row));
        assertTrue(service.canAccessCase("lc1", row));
        assertFalse(service.canAccessCase("mallory", row));
    }

    @Test
    void aPreviousHandlerKeepsAccessAfterForwardingTheCase() {
        jdbc.previousHandlerCount = 1;
        assertTrue(service.canAccessCase("mallory", caseOwnedBy("alice")));
    }

    @Test
    void aDatabaseFailureWhileCheckingPreviousHandlersDeniesAccess() {
        jdbc.previousHandlerLookupFails = true;
        assertFalse(service.canAccessCase("mallory", caseOwnedBy("alice")));
    }

    @Test
    void anUnknownCaseIsReportedAsNotFound() {
        ResponseEntity<?> response = service.requireCaseActor("CASE-404", "alice");
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
