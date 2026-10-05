package lcdjp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/map")
public class MapController {


    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(MapController.class);
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private GoogleMapsService googleMapsService;

    @Autowired
    private GoogleMapsProperties googleMapsProperties;

    @Value("${google.maps.public-key:}")
    private String publicMapsKey;

    @GetMapping("/lcs")
    public ResponseEntity<?> getLCLocations(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String subCounty,
            @RequestParam(required = false) String parish,
            @RequestParam(required = false) String village) {
        try {
            StringBuilder sql = new StringBuilder(
                    "SELECT username, first_name, last_name, district, sub_county, parish, " +
                            "village, lc_level, phone, latitude, longitude " +
                            "FROM users " +
                            "WHERE role = 'LC Official' AND approval_status = 'Approved'");

            List<Object> params = new ArrayList<>();

            if (district != null && !district.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(district)) = LOWER(TRIM(?))"); params.add(district); }
            if (subCounty != null && !subCounty.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(sub_county)) = LOWER(TRIM(?))"); params.add(subCounty); }
            if (parish != null && !parish.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(parish)) = LOWER(TRIM(?))"); params.add(parish); }
            if (village != null && !village.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(village)) = LOWER(TRIM(?))"); params.add(village); }

            List<Map<String, Object>> lcs = jdbcTemplate.queryForList(sql.toString(), params.toArray());
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

            StringBuilder sql = new StringBuilder(
                    "SELECT username, first_name, last_name, district, sub_county, parish, " +
                            "village, lawyer_specialization, phone, email, latitude, longitude, " +
                            "(SELECT COUNT(*) FROM cases c2 WHERE c2.assigned_lawyer = users.username AND c2.status NOT IN ('Resolved','Closed')) AS active_count " +
                            "FROM users " +
                            "WHERE role = 'Lawyer' AND approval_status = 'Approved'");

            List<Object> params = new ArrayList<>();

            if (district != null && !district.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(district)) = LOWER(TRIM(?))"); params.add(district); }
            if (specialization != null && !specialization.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(lawyer_specialization)) = LOWER(TRIM(?))"); params.add(specialization); }

            List<Map<String, Object>> lawyers = jdbcTemplate.queryForList(sql.toString(), params.toArray());
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

            try {
                jdbcTemplate.queryForObject("SELECT 1 FROM legal_aid_organizations LIMIT 1", Integer.class);
            } catch (Exception e) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            StringBuilder sql = new StringBuilder(
                    "SELECT id, org_name, district, sub_county, parish, phone, email, " +
                            "specialization, description, latitude, longitude " +
                            "FROM legal_aid_organizations WHERE 1=1");

            List<Object> params = new ArrayList<>();

            if (district != null && !district.trim().isEmpty()) { sql.append(" AND LOWER(TRIM(district)) = LOWER(TRIM(?))"); params.add(district); }

            List<Map<String, Object>> orgs = jdbcTemplate.queryForList(sql.toString(), params.toArray());
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
            Double lat = null;
            Double lng = null;

            if (row.get("latitude") != null) {
                try {
                    lat = ((Number) row.get("latitude")).doubleValue();
                } catch (Exception e) {}
            }
            if (lat == null && row.get("lat") != null) {
                try {
                    lat = ((Number) row.get("lat")).doubleValue();
                } catch (Exception e) {}
            }

            if (row.get("longitude") != null) {
                try {
                    lng = ((Number) row.get("longitude")).doubleValue();
                } catch (Exception e) {}
            }
            if (lng == null && row.get("lng") != null) {
                try {
                    lng = ((Number) row.get("lng")).doubleValue();
                } catch (Exception e) {}
            }

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

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("❌ Route error: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get directions. Please try again later."));
        }
    }
}