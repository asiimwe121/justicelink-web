package lcdjp.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LoginLockoutServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private LoginLockoutService service;

    private static final String BUMP = "UPDATE login_lockouts SET failed_attempts";

    private void attemptsNowAre(int attempts) {
        when(jdbcTemplate.queryForList(contains("SELECT failed_attempts"), anyString()))
                .thenReturn(List.of(Map.of("failed_attempts", attempts)));
    }

    @Test
    void firstAndSecondFailuresDoNotBlock() {
        when(jdbcTemplate.update(startsWith(BUMP), any(), eq("realuser"))).thenReturn(1);

        attemptsNowAre(1);
        LoginLockoutService.FailureResult first = service.recordFailure("realuser");
        assertFalse(first.locked);
        assertEquals(2, first.attemptsRemaining);

        attemptsNowAre(2);
        LoginLockoutService.FailureResult second = service.recordFailure("realuser");
        assertFalse(second.locked);
        assertEquals(1, second.attemptsRemaining);
    }

    @Test
    void thirdFailureBlocksTheAccount() {
        when(jdbcTemplate.update(startsWith(BUMP), any(), eq("realuser"))).thenReturn(1);
        attemptsNowAre(3);
        LocalDateTime until = LocalDateTime.now().plusHours(5);
        when(jdbcTemplate.queryForList(contains("SELECT locked_until"), eq("realuser")))
                .thenReturn(List.of(Map.of("locked_until", Timestamp.valueOf(until))));

        LoginLockoutService.FailureResult result = service.recordFailure("realuser");

        assertTrue(result.locked);
        assertEquals(0, result.attemptsRemaining);
        assertNotNull(result.lockedUntil);
        verify(jdbcTemplate).update(contains("SET locked_until"), any(LocalDateTime.class), eq("realuser"));
    }

    @Test
    void usernamesAreNormalisedSoCaseCannotBypassTheLimit() {
        when(jdbcTemplate.update(startsWith(BUMP), any(), eq("realuser"))).thenReturn(1);
        attemptsNowAre(1);

        service.recordFailure("  RealUser ");

        verify(jdbcTemplate).update(startsWith(BUMP), any(), eq("realuser"));
    }

    @Test
    void firstEverFailureInsertsARow() {
        when(jdbcTemplate.update(startsWith(BUMP), any(), eq("newuser"))).thenReturn(0);
        attemptsNowAre(1);

        service.recordFailure("newuser");

        verify(jdbcTemplate).update(startsWith("INSERT INTO login_lockouts"), eq("newuser"), any());
    }

    @Test
    void raceOnFirstInsertFallsBackToIncrementing() {
        when(jdbcTemplate.update(startsWith(BUMP), any(), eq("newuser"))).thenReturn(0, 1);
        when(jdbcTemplate.update(startsWith("INSERT INTO login_lockouts"), eq("newuser"), any()))
                .thenThrow(new DuplicateKeyException("dup"));
        attemptsNowAre(2);

        LoginLockoutService.FailureResult result = service.recordFailure("newuser");

        assertFalse(result.locked);
        assertEquals(1, result.attemptsRemaining);
    }

    @Test
    void activeBlockIsReportedAndExpiredBlockIsCleared() {
        when(jdbcTemplate.queryForList(contains("SELECT locked_until"), eq("blocked")))
                .thenReturn(List.of(Map.of("locked_until", Timestamp.valueOf(LocalDateTime.now().plusHours(1)))));
        assertNotNull(service.lockedUntil("blocked"));
        assertTrue(service.isLocked("blocked"));

        when(jdbcTemplate.queryForList(contains("SELECT locked_until"), eq("expired")))
                .thenReturn(List.of(Map.of("locked_until", Timestamp.valueOf(LocalDateTime.now().minusMinutes(1)))));
        assertNull(service.lockedUntil("expired"));
        verify(jdbcTemplate).update(startsWith("DELETE FROM login_lockouts WHERE username"), eq("expired"));
    }

    @Test
    void unknownUsernameIsNotBlocked() {
        when(jdbcTemplate.queryForList(contains("SELECT locked_until"), eq("nobody"))).thenReturn(List.of());
        assertNull(service.lockedUntil("nobody"));
    }

    @Test
    void successAndUnlockClearTheRow() {
        when(jdbcTemplate.update(startsWith("DELETE FROM login_lockouts WHERE username"), eq("realuser"))).thenReturn(1);

        service.recordSuccess("realuser");
        assertTrue(service.unlock("RealUser"));
        verify(jdbcTemplate, times(2)).update(startsWith("DELETE FROM login_lockouts WHERE username"), eq("realuser"));
    }
}
