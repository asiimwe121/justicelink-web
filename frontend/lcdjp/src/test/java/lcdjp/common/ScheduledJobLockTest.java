package lcdjp.common;

import lcdjp.user.AccountRetentionService;
import lcdjp.admin.AuditLogService;
import lcdjp.cases.CaseEscalationService;
import lcdjp.user.UserCaseCleanupService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** With several replicas every instance fires the cron; only the one holding the lock may touch the database. */
class ScheduledJobLockTest {

    private static SchedulerLock lockThatRuns() {
        SchedulerLock lock = mock(SchedulerLock.class);
        when(lock.runExclusive(any(), any(), any(), any())).thenAnswer(invocation -> {
            ((Runnable) invocation.getArgument(3)).run();
            return true;
        });
        return lock;
    }

    private static SchedulerLock lockHeldElsewhere() {
        SchedulerLock lock = mock(SchedulerLock.class);
        when(lock.runExclusive(any(), any(), any(), any())).thenReturn(false);
        return lock;
    }

    private CaseEscalationService escalation(SchedulerLock lock, JdbcTemplate jdbc) {
        CaseEscalationService service = new CaseEscalationService();
        ReflectionTestUtils.setField(service, "jdbcTemplate", jdbc);
        ReflectionTestUtils.setField(service, "auditLogService", mock(AuditLogService.class));
        ReflectionTestUtils.setField(service, "schedulerLock", lock);
        ReflectionTestUtils.setField(service, "escalationDays", 3);
        return service;
    }

    private AccountRetentionService retention(SchedulerLock lock, JdbcTemplate jdbc) {
        AccountRetentionService service = new AccountRetentionService();
        ReflectionTestUtils.setField(service, "jdbcTemplate", jdbc);
        ReflectionTestUtils.setField(service, "userCaseCleanupService", mock(UserCaseCleanupService.class));
        ReflectionTestUtils.setField(service, "auditLogService", mock(AuditLogService.class));
        ReflectionTestUtils.setField(service, "schedulerLock", lock);
        ReflectionTestUtils.setField(service, "retentionMonths", 6);
        return service;
    }

    @Test
    void escalationDoesNothingOnAnInstanceThatLostTheLock() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);

        escalation(lockHeldElsewhere(), jdbc).escalateStaleCases();

        verifyNoInteractions(jdbc);
    }

    @Test
    void escalationRunsOnTheInstanceThatWonTheLock() {
        SchedulerLock lock = lockThatRuns();
        JdbcTemplate jdbc = mock(JdbcTemplate.class);

        escalation(lock, jdbc).escalateStaleCases();

        verify(lock).runExclusive(eq("case-escalation"), any(Duration.class), any(Duration.class), any(Runnable.class));
        verify(jdbc).queryForList(contains("FROM cases"));
    }

    @Test
    void retentionDoesNothingOnAnInstanceThatLostTheLock() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);

        retention(lockHeldElsewhere(), jdbc).purgeLongDeactivatedAccounts();

        verifyNoInteractions(jdbc);
    }

    @Test
    void retentionRunsOnTheInstanceThatWonTheLock() {
        SchedulerLock lock = lockThatRuns();
        JdbcTemplate jdbc = mock(JdbcTemplate.class);

        retention(lock, jdbc).purgeLongDeactivatedAccounts();

        verify(lock).runExclusive(eq("account-retention"), any(Duration.class), any(Duration.class), any(Runnable.class));
        verify(jdbc).queryForList(contains("deactivated_at"), any(java.time.LocalDateTime.class));
    }
}
