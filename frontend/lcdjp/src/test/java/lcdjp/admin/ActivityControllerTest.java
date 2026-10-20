package lcdjp.admin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityControllerTest {

    @Mock private ActivityLogRepository activityRepository;

    @InjectMocks
    private ActivityController controller;

    @Test
    void getRecentActivity_success_returnsLogsAndCount() {
        when(activityRepository.findLastFiveActivities()).thenReturn(List.of(new ActivityLog(), new ActivityLog()));

        ResponseEntity<?> result = controller.getRecentActivity();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(true, body.get("success"));
        assertEquals(2, body.get("count"));
    }

    @Test
    void getRecentActivity_repositoryThrows_returns500_notPropagating() {
        when(activityRepository.findLastFiveActivities()).thenThrow(new RuntimeException("db down"));

        ResponseEntity<?> result = controller.getRecentActivity();

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        assertEquals("Request could not be processed. Please try again later.",
                ((Map<?, ?>) result.getBody()).get("error"));
    }

    @Test
    void getUserActivity_delegatesUsernameToRepository() {
        when(activityRepository.findTop500ByUsernameOrderByCreatedAtDesc("jdoe")).thenReturn(List.of(new ActivityLog()));

        ResponseEntity<?> result = controller.getUserActivity("jdoe");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(activityRepository).findTop500ByUsernameOrderByCreatedAtDesc("jdoe");
    }

    @Test
    void getEntityActivity_delegatesEntityTypeAndId() {
        when(activityRepository.findTop500ByEntityTypeAndEntityIdOrderByCreatedAtDesc("case", "42"))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.getEntityActivity("case", "42");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(activityRepository).findTop500ByEntityTypeAndEntityIdOrderByCreatedAtDesc("case", "42");
    }

    @Test
    void getActionActivity_delegatesAction() {
        when(activityRepository.findTop500ByActionOrderByCreatedAtDesc("CREATE")).thenReturn(List.of());

        ResponseEntity<?> result = controller.getActionActivity("CREATE");

        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void getActivityByDateRange_validDates_parsesAndDelegates() {
        when(activityRepository.findTop500ByCreatedAtBetweenOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of());

        ResponseEntity<?> result = controller.getActivityByDateRange(
                "2026-01-01T00:00:00", "2026-01-31T23:59:59");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(activityRepository).findTop500ByCreatedAtBetweenOrderByCreatedAtDesc(
                eq(LocalDateTime.parse("2026-01-01T00:00:00")), eq(LocalDateTime.parse("2026-01-31T23:59:59")));
    }

    @Test
    void getActivityByDateRange_unparsableDate_returns400_notServerError() {
        ResponseEntity<?> result = controller.getActivityByDateRange("not-a-date", "also-not-a-date");

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        verifyNoInteractions(activityRepository);
    }

    @Test
    void getActivityStats_convertsObjectArrayRowsIntoActionStatsMap() {
        when(activityRepository.count()).thenReturn(10L);
        when(activityRepository.countByCreatedAtAfter(any())).thenReturn(3L);
        when(activityRepository.countActionsByType()).thenReturn(
                List.of(new Object[]{"CREATE", 6L}, new Object[]{"DELETE", 4L}));

        ResponseEntity<?> result = controller.getActivityStats();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(10L, body.get("total"));
        assertEquals(3L, body.get("last24Hours"));
        @SuppressWarnings("unchecked")
        Map<String, Long> actionStats = (Map<String, Long>) body.get("actionStats");
        assertEquals(6L, actionStats.get("CREATE"));
        assertEquals(4L, actionStats.get("DELETE"));
    }

    @Test
    void clearOldLogs_defaultsTo30Days_whenNoParamGiven() {
        when(activityRepository.deleteByCreatedAtBefore(any())).thenReturn(12);

        ResponseEntity<?> result = controller.clearOldLogs(30);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(12, body.get("deleted"));
        assertEquals("Deleted 12 old logs", body.get("message"));
    }
}
