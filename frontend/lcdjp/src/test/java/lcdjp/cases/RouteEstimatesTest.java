package lcdjp.cases;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RouteEstimatesTest {

    /** Shape of an OSRM answer: one route, one leg, two steps, 14 km, a driving duration of 21 minutes. */
    private Map<String, Object> osrmAnswer() {
        Map<String, Object> step1 = new HashMap<>();
        step1.put("distance", 4200.0);
        step1.put("duration", 380.0);
        Map<String, Object> step2 = new HashMap<>();
        step2.put("distance", 9800.0);
        step2.put("duration", 880.0);
        Map<String, Object> leg = new HashMap<>();
        leg.put("distance", 14000.0);
        leg.put("duration", 1260.0);
        leg.put("steps", new ArrayList<>(List.of(step1, step2)));
        Map<String, Object> route = new HashMap<>();
        route.put("distance", 14000.0);
        route.put("duration", 1260.0);
        route.put("legs", new ArrayList<>(List.of(leg)));
        Map<String, Object> result = new HashMap<>();
        result.put("code", "Ok");
        result.put("routes", new ArrayList<>(List.of(route)));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> firstRoute(Map<String, Object> result) {
        return ((List<Map<String, Object>>) result.get("routes")).get(0);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> firstLeg(Map<String, Object> route) {
        return ((List<Map<String, Object>>) route.get("legs")).get(0);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> steps(Map<String, Object> leg) {
        return (List<Map<String, Object>>) leg.get("steps");
    }

    @Test
    void walking_replacesDrivingTimeWithAWalkingEstimate() {
        Map<String, Object> result = osrmAnswer();

        RouteEstimates.applyFallbackEstimate(result, "WALKING");

        Map<String, Object> route = firstRoute(result);
        assertEquals(10000.0, (Double) route.get("duration"), 0.001);     // 14 km at 1.4 m/s = 2 h 47 min
        assertEquals(10000.0, (Double) firstLeg(route).get("duration"), 0.001);
        assertEquals(3000.0, (Double) steps(firstLeg(route)).get(0).get("duration"), 0.001);
        assertEquals(7000.0, (Double) steps(firstLeg(route)).get(1).get("duration"), 0.001);
        assertEquals(true, route.get("approximate"));
        assertEquals("osrm", result.get("source"));
    }

    @Test
    void bicycling_usesAFasterSpeedThanWalkingButSlowerThanTheDrivingTime() {
        Map<String, Object> result = osrmAnswer();

        RouteEstimates.applyFallbackEstimate(result, "bicycling");

        double seconds = (Double) firstRoute(result).get("duration");
        assertEquals(14000.0 / 4.2, seconds, 0.001);
        assertTrue(seconds > 1260.0 && seconds < 10000.0);
    }

    @Test
    void driving_keepsOsrmDurationsButIsStillMarkedApproximate() {
        Map<String, Object> result = osrmAnswer();

        RouteEstimates.applyFallbackEstimate(result, "DRIVING");

        Map<String, Object> route = firstRoute(result);
        assertEquals(1260.0, (Double) route.get("duration"), 0.001);
        assertEquals(380.0, (Double) steps(firstLeg(route)).get(0).get("duration"), 0.001);
        assertEquals(true, route.get("approximate"));
    }

    @Test
    void unknownOrMissingMode_isTreatedAsDriving() {
        for (String mode : new String[] {null, "", "TRANSIT", "flying"}) {
            Map<String, Object> result = osrmAnswer();
            RouteEstimates.applyFallbackEstimate(result, mode);
            assertEquals(1260.0, (Double) firstRoute(result).get("duration"), 0.001, "mode=" + mode);
        }
    }

    @Test
    void answerWithoutRoutes_isLeftAlone() {
        Map<String, Object> result = new HashMap<>();
        result.put("code", "Ok");

        RouteEstimates.applyFallbackEstimate(result, "WALKING");

        assertEquals("osrm", result.get("source"));
        assertEquals(2, result.size());
    }
}
