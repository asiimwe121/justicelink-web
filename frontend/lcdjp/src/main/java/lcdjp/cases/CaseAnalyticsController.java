package lcdjp.cases;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;

/** Case analytics and dashboard statistics. */
@RestController
@RequestMapping("/api/cases")
public class CaseAnalyticsController extends CaseApiSupport {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CaseAnalyticsController.class);
    @Autowired
    private StatisticsService statisticsService;

    @Autowired
    private CaseAnalyticsService caseAnalyticsService;

    @GetMapping("/analytics")
    public ResponseEntity<?> getCaseAnalytics() {
            String actor = authenticatedUsername();
            if (actor == null || !isAdministrator(actor)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only administrators may view case analytics"));
            }

            Map<String, Object> actorRow = userRow(actor);
            String role = strVal(actorRow.get("role")).toUpperCase().replace(' ', '_');
            boolean isDistrictAdmin = role.equals("DISTRICT_ADMIN");

            String district = null;
            if (isDistrictAdmin) {
                district = strVal(actorRow.get("district"));
                if (district.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "District Admin has no assigned district."));
                }
            }

            return ResponseEntity.ok(caseAnalyticsService.analytics(district));
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getStatistics() {
            return ResponseEntity.ok(Map.of("success", true, "statistics", statisticsService.caseStatistics()));
    }
}
