package lcdjp.maps;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lcdjp.cases.LcJurisdiction;
import java.util.*;

@RestController
@RequestMapping("/api/map")
public class MapController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(MapController.class);
    @Autowired
    private MapLocationRepository mapLocations;

    @Autowired
    private GoogleMapsService googleMapsService;

    @Autowired
    private GoogleMapsProperties googleMapsProperties;

    @Value("${google.maps.public-key:}")
    private String publicMapsKey;

    /**
     * Registered LC officials. Without {@code level} this is the plain filtered list used by the map. With
     * {@code level} (LC1, LC2 or LC3) only officials whose own area matches the whole chain for that level are
     * returned, so a citizen is never shown the LC of another village, parish or sub-county.
     */
    @GetMapping("/lcs")
    public ResponseEntity<?> getLCLocations(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String subCounty,
            @RequestParam(required = false) String parish,
            @RequestParam(required = false) String village,
            @RequestParam(required = false) String level) {
        try {
            if (level != null && !level.isBlank()) {
                String wanted = level.trim().toUpperCase(Locale.ROOT);
                if (!LcJurisdiction.DISPUTE_LEVELS.contains(wanted)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "level must be LC1, LC2 or LC3"));
                }
                Map<String, String> area = new HashMap<>();
                area.put("district", district);
                area.put("subCounty", subCounty);
                area.put("parish", parish);
                area.put("village", village);
                // Narrow in SQL by the district (required to be present), then verify the full chain in code.
                if (district == null || district.isBlank()) return ResponseEntity.ok(new ArrayList<>());
                List<Map<String, Object>> inDistrict = mapLocations.findApprovedLcOfficials(district, null, null, null);
                List<Map<String, Object>> lcs = LcJurisdiction.filterCovering(inDistrict, wanted, area);
                enrichWithCoordinates(lcs);
                return ResponseEntity.ok(lcs);
            }
            List<Map<String, Object>> lcs = mapLocations.findApprovedLcOfficials(district, subCounty, parish, village);
            enrichWithCoordinates(lcs);
            return ResponseEntity.ok(lcs);

        } catch (Exception e) {
            logger.error("❌ Error fetching LC locations: ", e);
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/lawyers")
    public ResponseEntity<?> getLawyerLocations(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String specialization) {
        try {
            List<Map<String, Object>> lawyers = mapLocations.findApprovedLawyers(district, specialization);
            enrichWithCoordinates(lawyers);
            return ResponseEntity.ok(lawyers);

        } catch (Exception e) {
            logger.error("❌ Error fetching lawyer locations: ", e);
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/legal-aid")
    public ResponseEntity<?> getLegalAidLocations(
            @RequestParam(required = false) String district) {
        try {

            if (!mapLocations.legalAidTableExists()) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            List<Map<String, Object>> orgs = mapLocations.findLegalAidOrganizations(district);
            enrichWithCoordinates(orgs);
            return ResponseEntity.ok(orgs);

        } catch (Exception e) {
            logger.error("❌ Error fetching legal aid locations: " + e.getMessage());
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/geocode")
    public ResponseEntity<?> geocodeAddress(@RequestParam String address) {
        if (address == null || address.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "address parameter is required"));
        }
        try {
            Map<String, Object> result = googleMapsService.geocodeAddress(address);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("❌ Geocode error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/reverse-geocode")
    public ResponseEntity<?> reverseGeocodeLocation(@RequestParam double lat, @RequestParam double lng) {
        try {
            Map<String, Object> result = googleMapsService.reverseGeocode(lat, lng);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("❌ Reverse geocode error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @GetMapping("/config")
    public ResponseEntity<?> getMapConfig() {
        String apiKey = googleMapsProperties.getPublicKey();
        if (apiKey == null || apiKey.isEmpty() || apiKey.startsWith("${")) {
            apiKey = googleMapsProperties.getApiKey();
        }

        Map<String, Object> config = new HashMap<>();
        config.put("mapsApiKey", apiKey);
        // Cloud-based Map ID (not a secret). Required for AdvancedMarkerElement and cloud map styling.
        String mapId = googleMapsProperties.getMapId();
        config.put("mapId", (mapId == null || mapId.isBlank() || mapId.startsWith("${")) ? "" : mapId.trim());
        config.put("apiKeyConfigured", apiKey != null && !apiKey.isEmpty() && !apiKey.startsWith("${"));
        config.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(config);
    }

    @GetMapping("/health")
    public ResponseEntity<?> mapsHealth() {
        try {
            String apiKey = googleMapsProperties.getApiKey();

            boolean isConfigured = apiKey != null && !apiKey.isEmpty() &&
                    !apiKey.startsWith("your_") && !apiKey.startsWith("${");

            Map<String, Object> health = new HashMap<>();
            health.put("status", isConfigured ? "UP" : "DOWN");
            health.put("service", "Google Maps");
            health.put("apiKeyConfigured", isConfigured);
            health.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(health);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    private void enrichWithCoordinates(List<Map<String, Object>> rows) {
        Map<String, double[]> locationCache = new HashMap<>();

        for (Map<String, Object> row : rows) {
            Double lat = firstNumber(row, "latitude", "lat");
            Double lng = firstNumber(row, "longitude", "lng");

            if (lat != null && lng != null) {
                row.put("latitude", lat);
                row.put("longitude", lng);
                continue;
            }

            String district = (String) row.get("district");
            if (district == null || district.isBlank()) continue;

            String subCounty = (String) row.get("sub_county");
            String parish = (String) row.get("parish");
            String village = (String) row.get("village");

            List<String> locationParts = new ArrayList<>();
            if (village != null && !village.isEmpty()) locationParts.add(village);
            if (parish != null && !parish.isEmpty()) locationParts.add(parish);
            if (subCounty != null && !subCounty.isEmpty()) locationParts.add(subCounty);
            locationParts.add(district);
            locationParts.add("Uganda");

            String locationToGeocode = String.join(", ", locationParts);
            String cacheKey = locationToGeocode;

            double[] coords = locationCache.computeIfAbsent(cacheKey, key -> {
                try {
                    Map<String, Object> geo = googleMapsService.geocodeAddress(locationToGeocode);
                    if ("OK".equals(geo.get("status"))) {
                        Object latObj = geo.get("lat");
                        Object lngObj = geo.get("lng");
                        if (latObj != null && lngObj != null) {
                            return new double[]{((Number) latObj).doubleValue(), ((Number) lngObj).doubleValue()};
                        }
                    }
                } catch (Exception e) {
                    logger.error("⚠️ Could not geocode: " + locationToGeocode);
                }
                return null;
            });

            if (coords != null) {
                row.put("latitude", coords[0]);
                row.put("longitude", coords[1]);
                row.put("lat", coords[0]);
                row.put("lng", coords[1]);
            } else {
                row.put("latitude", 1.3733);
                row.put("longitude", 32.2903);
                row.put("lat", 1.3733);
                row.put("lng", 32.2903);
            }
        }
    }

    @GetMapping("/route")
    public ResponseEntity<?> getRoute(
            @RequestParam double originLat,
            @RequestParam double originLng,
            @RequestParam double destinationLat,
            @RequestParam double destinationLng,
            @RequestParam(defaultValue = "DRIVING") String mode) {

        try {

            Map<String, Object> result = googleMapsService.getDirections(
                    originLat, originLng,
                    destinationLat, destinationLng,
                    mode
            );

            if (result == null || !"OK".equals(result.get("status"))) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of("error", "Could not calculate a road route right now. Please try again."));
            }
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("❌ Route error: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get directions. Please try again later."));
        }
    }

    /** First key whose value is a number; a value of the wrong type is logged and skipped instead of silently dropped. */
    private static Double firstNumber(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            Object value = row.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return number.doubleValue();
            }
            org.slf4j.LoggerFactory.getLogger(MapController.class)
                    .warn("Map row has a non-numeric '{}' value of type {}; ignoring it", key, value.getClass().getSimpleName());
        }
        return null;
    }
}
