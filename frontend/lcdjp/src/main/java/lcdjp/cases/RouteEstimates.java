package lcdjp.cases;

import java.util.List;
import java.util.Map;

/**
 * Fixes up routes that come from the public OSRM fallback router.
 *
 * <p>OSRM only knows driving, so a "Walk" or "Bike" request would otherwise show the driving time
 * (for example 21 min for a 14 km walk). For walking and cycling the duration is re-estimated from
 * the road distance, and every fallback route is flagged {@code approximate} so the app can show it as
 * an estimate. Driving keeps OSRM's own duration.
 */
public final class RouteEstimates {

    /** About 5 km/h. */
    static final double WALKING_METERS_PER_SECOND = 1.4;
    /** About 15 km/h. */
    static final double BICYCLING_METERS_PER_SECOND = 4.2;

    private RouteEstimates() {
    }

    /**
     * Marks the OSRM answer as approximate and, for walking and cycling, replaces the driving
     * durations on each route, leg and step with distance-based estimates.
     */
    @SuppressWarnings("unchecked")
    public static void applyFallbackEstimate(Map<String, Object> osrmResult, String mode) {
        osrmResult.put("source", "osrm");
        double speed = speedFor(mode);
        if (!(osrmResult.get("routes") instanceof List<?> routes)) {
            return;
        }
        for (Object routeObject : routes) {
            if (!(routeObject instanceof Map<?, ?> routeMap)) {
                continue;
            }
            Map<String, Object> route = (Map<String, Object>) routeMap;
            route.put("approximate", true);
            if (speed <= 0) {
                continue;
            }
            reestimate(route, speed);
            if (!(route.get("legs") instanceof List<?> legs)) {
                continue;
            }
            for (Object legObject : legs) {
                if (!(legObject instanceof Map<?, ?> legMap)) {
                    continue;
                }
                Map<String, Object> leg = (Map<String, Object>) legMap;
                reestimate(leg, speed);
                if (leg.get("steps") instanceof List<?> steps) {
                    for (Object stepObject : steps) {
                        if (stepObject instanceof Map<?, ?> stepMap) {
                            reestimate((Map<String, Object>) stepMap, speed);
                        }
                    }
                }
            }
        }
    }

    /** Metres per second for walking and cycling; 0 means keep the driving duration. */
    static double speedFor(String mode) {
        if (mode == null) {
            return 0;
        }
        return switch (mode.trim().toUpperCase()) {
            case "WALKING" -> WALKING_METERS_PER_SECOND;
            case "BICYCLING" -> BICYCLING_METERS_PER_SECOND;
            default -> 0;
        };
    }

    private static void reestimate(Map<String, Object> item, double metersPerSecond) {
        if (item.get("distance") instanceof Number distance) {
            item.put("duration", distance.doubleValue() / metersPerSecond);
        }
    }
}
