package lcdjp.cases;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticsServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private StatisticsService service;

    @Test
    void caseStatistics_returnsPlainNumbersForEveryCaseCount() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(4);

        Map<String, Object> stats = service.caseStatistics();

        assertEquals(4, stats.get("totalCases"));
        assertEquals(4, stats.get("pendingCases"));
        assertEquals(4, stats.get("resolvedCases"));
        assertEquals(4, stats.get("withLawyers"));
    }

    @Test
    void adminStatistics_includesCaseAndUserAndVerificationCounts() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(7);

        Map<String, Object> stats = service.adminStatistics();

        for (String key : new String[] {"totalCases", "pendingCases", "resolvedCases", "withLawyers",
                "totalUsers", "citizens", "lawyers", "lcOfficials",
                "pendingVerifications", "approvedVerifications", "rejectedVerifications"}) {
            assertEquals(7, stats.get(key), key);
        }
    }

    @Test
    void nullCountFromTheDatabaseBecomesZero() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(null);

        assertEquals(0, service.caseStatistics().get("totalCases"));
    }

    @Test
    void databaseFailureIsNotSwallowedSoNothingBrokenGetsCached() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenThrow(new RuntimeException("db down"));

        assertThrows(RuntimeException.class, () -> service.adminStatistics());
    }
}
