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
import org.springframework.jdbc.core.RowMapper;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SessionRevocationServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private SessionRevocationService service;

    @SuppressWarnings("unchecked")
    private void revokedAt(long millis) {
        when(jdbcTemplate.query(startsWith("SELECT revoked_at_ms"), any(RowMapper.class), eq("jane")))
                .thenReturn(List.of(millis));
    }

    @SuppressWarnings("unchecked")
    private void neverRevoked() {
        when(jdbcTemplate.query(startsWith("SELECT revoked_at_ms"), any(RowMapper.class), anyString()))
                .thenReturn(List.of());
    }

    @Test
    void revokeAllUpdatesAnExistingRow() {
        when(jdbcTemplate.update(startsWith("UPDATE session_revocations"), anyLong(), eq("jane"))).thenReturn(1);

        service.revokeAll("  Jane ");

        verify(jdbcTemplate).update(startsWith("UPDATE session_revocations"), anyLong(), eq("jane"));
        verify(jdbcTemplate, never()).update(startsWith("INSERT"), any(), any());
    }

    @Test
    void revokeAllInsertsTheFirstTime() {
        when(jdbcTemplate.update(startsWith("UPDATE session_revocations"), anyLong(), eq("jane"))).thenReturn(0);

        service.revokeAll("jane");

        verify(jdbcTemplate).update(startsWith("INSERT INTO session_revocations"), eq("jane"), anyLong());
    }

    @Test
    void revokeAllSurvivesARaceOnTheFirstInsert() {
        when(jdbcTemplate.update(startsWith("UPDATE session_revocations"), anyLong(), eq("jane"))).thenReturn(0, 1);
        when(jdbcTemplate.update(startsWith("INSERT INTO session_revocations"), eq("jane"), anyLong()))
                .thenThrow(new DuplicateKeyException("dup"));

        assertDoesNotThrow(() -> service.revokeAll("jane"));
    }

    @Test
    void blankUsernameIsIgnored() {
        service.revokeAll("  ");
        assertFalse(service.isRevoked(null, new Date()));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void nobodyWhoWasNeverRevokedIsRefused() {
        neverRevoked();
        assertFalse(service.isRevoked("jane", new Date()));
    }

    @Test
    void tokenIssuedBeforeTheResetIsRefused() {
        revokedAt(10_000_000L);
        assertTrue(service.isRevoked("jane", new Date(9_000_000L)));
    }

    @Test
    void tokenIssuedInTheSameSecondAsTheResetIsRefused() {
        revokedAt(10_500L);
        assertTrue(service.isRevoked("jane", new Date(10_000L)));
    }

    @Test
    void tokenIssuedAfterTheResetIsAccepted() {
        revokedAt(10_000_000L);
        assertFalse(service.isRevoked("jane", new Date(10_002_000L)));
    }

    @Test
    void tokenWithNoIssuedAtIsRefusedOnceARevocationExists() {
        revokedAt(10_000_000L);
        assertTrue(service.isRevoked("jane", null));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aBrokenLookupDoesNotLockEveryoneOut() {
        when(jdbcTemplate.query(startsWith("SELECT revoked_at_ms"), any(RowMapper.class), anyString()))
                .thenThrow(new RuntimeException("table missing"));
        assertFalse(service.isRevoked("jane", new Date()));
    }
}
