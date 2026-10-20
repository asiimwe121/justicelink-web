package lcdjp.cases;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CaseEscalationServiceTest {

    private final LocalDateTime now = LocalDateTime.of(2026, 10, 6, 12, 0);

    @Test
    void freshCaseIsNotEscalated() {
        assertEquals(0, CaseEscalationService.targetLevel(now.minusDays(1), now, 3, false));
    }

    @Test
    void caseOlderThanThresholdReachesLevelOne() {
        assertEquals(1, CaseEscalationService.targetLevel(now.minusDays(3), now, 3, false));
        assertEquals(1, CaseEscalationService.targetLevel(now.minusDays(5), now, 3, false));
    }

    @Test
    void caseOlderThanTwiceThresholdReachesLevelTwo() {
        assertEquals(2, CaseEscalationService.targetLevel(now.minusDays(6), now, 3, false));
    }

    @Test
    void urgentCasesUseShorterClock() {
        // 3 days / 6 = 12 hours for urgent reports
        assertEquals(0, CaseEscalationService.targetLevel(now.minusHours(6), now, 3, true));
        assertEquals(1, CaseEscalationService.targetLevel(now.minusHours(13), now, 3, true));
        assertEquals(2, CaseEscalationService.targetLevel(now.minusHours(25), now, 3, true));
    }

    @Test
    void missingDateOrDisabledSettingNeverEscalates() {
        assertEquals(0, CaseEscalationService.targetLevel(null, now, 3, false));
        assertEquals(0, CaseEscalationService.targetLevel(now.minusDays(30), now, 0, false));
    }
}
