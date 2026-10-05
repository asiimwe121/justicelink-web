package lcdjp;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityLogRepository activityRepository;

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentActivity() {
        try {
            List<ActivityLog> logs = activityRepository.findLastFiveActivities();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllActivity() {
        try {
            List<ActivityLog> logs = activityRepository.findRecentActivities();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserActivity(@PathVariable String username) {
        try {
            List<ActivityLog> logs = activityRepository.findTop500ByUsernameOrderByCreatedAtDesc(username);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<?> getEntityActivity(@PathVariable String entityType,
                                               @PathVariable String entityId) {
        try {
            List<ActivityLog> logs = activityRepository.findTop500ByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/action/{action}")
    public ResponseEntity<?> getActionActivity(@PathVariable String action) {
        try {
            List<ActivityLog> logs = activityRepository.findTop500ByActionOrderByCreatedAtDesc(action);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/date-range")
    public ResponseEntity<?> getActivityByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            LocalDateTime start = LocalDateTime.parse(startDate);
            LocalDateTime end = LocalDateTime.parse(endDate);
            List<ActivityLog> logs = activityRepository.findTop500ByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "logs", logs,
                    "count", logs.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getActivityStats() {
        try {
            long total = activityRepository.count();
            long recentCount = activityRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(1));
            List<Object[]> actionStats = activityRepository.countActionsByType();

            Map<String, Long> stats = new java.util.HashMap<>();
            for (Object[] result : actionStats) {
                stats.put((String) result[0], (Long) result[1]);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "total", total,
                    "last24Hours", recentCount,
                    "actionStats", stats
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @DeleteMapping("/clear-old")
    public ResponseEntity<?> clearOldLogs(@RequestParam(defaultValue = "30") int days) {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
            int deleted = activityRepository.deleteByCreatedAtBefore(cutoff);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Deleted " + deleted + " old logs",
                    "deleted", deleted
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }
}